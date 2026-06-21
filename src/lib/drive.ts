/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Interview } from "../types";

// Standard Google Drive V3 URL base
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_API_BASE = "https://www.googleapis.com/upload/drive/v3";

/**
 * Helper to execute authorized fetch requests.
 */
async function driveFetch(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  
  const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive API Error (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Searches for or creates a folder inside Google Drive.
 * @returns The ID of the folder.
 */
export async function getOrCreateFolder(
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  // Seek folder
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const listUrl = `/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const listResult = await driveFetch(listUrl, token);

  if (listResult.files && listResult.files.length > 0) {
    return listResult.files[0].id;
  }

  // Not found, create it
  const createHeaders = new Headers();
  createHeaders.set("Content-Type", "application/json");

  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const response = await fetch(`${DRIVE_API_BASE}/files?fields=id`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create folder '${folderName}': ${errText}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Uploads a text file (such as JSON representations) to Google Drive.
 */
export async function uploadJsonFile(
  token: string,
  fileName: string,
  content: string,
  parentFolderId?: string,
  existingFileId?: string
): Promise<string> {
  const isUpdate = !!existingFileId;
  const url = isUpdate 
    ? `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`
    : `${UPLOAD_API_BASE}/files?uploadType=multipart`;

  const metadata: any = {
    name: fileName,
    mimeType: "application/json",
  };

  if (!isUpdate && parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  // Multipart request containing metadata (JSON) + media (JSON)
  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body = 
    delimiter +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: application/json\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload ${fileName}: ${errText}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Uploads a binary Blob (PDF file) to Google Drive.
 */
export async function uploadPdfFile(
  token: string,
  fileName: string,
  pdfBlob: Blob,
  parentFolderId?: string,
  existingFileId?: string
): Promise<string> {
  const isUpdate = !!existingFileId;
  const url = isUpdate 
    ? `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=media`
    : `${UPLOAD_API_BASE}/files?uploadType=multipart`;

  if (isUpdate) {
    // Standard direct media upload for updates
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/pdf",
      },
      body: pdfBlob,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to update PDF ${fileName}: ${errText}`);
    }

    const result = await response.json();
    return result.id;
  } else {
    // Multipart media creation with metadata + file content
    const metadata: any = {
      name: fileName,
      mimeType: "application/pdf",
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Convert metadata & blob into a combined array buffer body
    const metadataPart = 
      delimiter +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: application/pdf\r\n\r\n`;

    const metadataBuffer = new TextEncoder().encode(metadataPart);
    const closeBuffer = new TextEncoder().encode(closeDelimiter);

    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBuffer = new Uint8Array(pdfArrayBuffer);

    // Combine them
    const combinedBuffer = new Uint8Array(
      metadataBuffer.byteLength + pdfBuffer.byteLength + closeBuffer.byteLength
    );
    combinedBuffer.set(metadataBuffer, 0);
    combinedBuffer.set(pdfBuffer, metadataBuffer.byteLength);
    combinedBuffer.set(closeBuffer, metadataBuffer.byteLength + pdfBuffer.byteLength);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: combinedBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to upload PDF ${fileName}: ${errText}`);
    }

    const result = await response.json();
    return result.id;
  }
}

/**
 * Searches for all files in the CREE_Entrevistas folders to construct local listing
 */
export async function listDriveInterviews(
  token: string,
  jsonFolderId: string
): Promise<Array<{ id: string; name: string; content?: string }>> {
  const query = `'${jsonFolderId}' in parents and mimeType = 'application/json' and trashed = false`;
  const listUrl = `/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=100`;
  const { files } = await driveFetch(listUrl, token);

  const results = [];
  if (files) {
    for (const file of files) {
      try {
        const contentUrl = `/files/${file.id}?alt=media`;
        const contentResponse = await fetch(`${DRIVE_API_BASE}${contentUrl}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (contentResponse.ok) {
          const jsonText = await contentResponse.text();
          results.push({
            id: file.id,
            name: file.name,
            content: jsonText,
          });
        }
      } catch (err) {
        console.error("Failed to read file content from Drive:", file.name, err);
      }
    }
  }

  return results;
}

/**
 * Deletes a file from Google Drive after confirmation
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Failed to delete Google Drive file ${fileId}: ${errText}`);
  }
}
