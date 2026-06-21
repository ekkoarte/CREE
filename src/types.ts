/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SchoolInfo {
  name: string;
  subName: string;
  address: string;
  rut: string;
}

export interface InterviewReason {
  id: number;
  label: string;
  hasCustomText: boolean;
  customText?: string;
}

export interface QuestionAnswer {
  id: string;
  question: string;
  answer: string;
}

export interface Interview {
  id: string; // Unique generated ID (UUID/timestamp)
  folio: string; // Document code (e.g., CREE-2026-001)
  date: string; // Date of interview
  time: string; // Time of interview
  
  // Participants
  studentName: string;
  studentGrade: string;
  studentRun?: string;
  guardianName?: string;
  guardianRun?: string;
  guardianRelationship?: string;
  interviewerName: string;
  interviewerRole: string;

  // Interview Content
  reasonId: number; // 1-10
  reasonCustomText?: string; // Text if choice is 8 or 9 or custom
  
  contextText: string; // Contextualización breve (Brevemente escribir qué sucedió, con quiénes sucedió y dónde sucedió)
  
  backgroundQuestions: QuestionAnswer[]; // Relatos y preguntas
  backgroundGeneralText?: string; // Additional notes
  
  agreementsText: string; // V. Acuerdos y/o compromisos
  supportMeasuresText: string; // V. Medidas de apoyo pedagógico y/o psicosocial
  
  // VI. Seguimiento y evaluación
  followUpDate: string; // Fecha de revisión
  followUpMechanism: string; // Mecanismo de revisión
  followUpResponsible: string; // Responsable del seguimiento

  // Metadata
  createdAt: number;
  updatedAt: number;
  syncedToDrive: boolean;
  driveFileId?: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
}
