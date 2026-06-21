/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import { Interview } from "../types";
import { getLogoDataUrl } from "./schoolLogo";

// Pre-defined list of reasons for easy lookup in case labels need to match exactly
export const INTERVIEW_REASONS = [
  "Notificación de activación de protocolo de actuación frente a de maltrato, acoso escolar o violencia entre miembros de la comunidad educativa.",
  "Notificación de activación de protocolo frente a situaciones de riesgo suicida.",
  "Notificación de activación de protocolo de actuación frente a la detección de situaciones de vulneración de derechos de párvulos, niños, niñas y adolescentes.",
  "Notificación de activación de protocolo frente a agresiones sexuales y hechos de connotación sexual que atenten contra la integridad de los estudiantes.",
  "Notificación de activación de protocolo frente a situaciones relacionadas a drogas y alcohol en el establecimiento.",
  "Notificación de activación protocolo de actuación frente a hechos de violencia en contra de profesores.",
  "Recopilación de antecedentes por situación de violencia escolar entre.",
  "Denuncia por...",
  "Recopilación de antecedentes por...",
  "Contención emocional"
];

export function generateInterviewPDF(interview: Interview, schoolLogoDataUrl?: string): Blob {
  // Create PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Pages are auto-buffered. We can query total page count at the end to add footer "Página X de Y" dynamically!
  const targetLogo = schoolLogoDataUrl || getLogoDataUrl(250, 250);
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174 mm
  let currentY = 15;

  /**
   * Helper to draw a running header on each page
   */
  const drawPageHeader = (pageNumber: number) => {
    // 1. Draw logo in top-left
    try {
      doc.addImage(targetLogo, "JPEG", margin, 12, 18, 18);
    } catch (e) {
      console.warn("Failed to load logo in PDF:", e);
    }

    // 2. School Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 74, 69); // Deep dark forest teal
    doc.text("COLEGIO CREE CERRO NAVIA", 39, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Área de Convivencia Escolar / Docencia", 39, 22);
    doc.text("Santiago, Chile", 39, 25);

    // 3. Document Identification (Folio box in top-right)
    doc.setFillColor(242, 247, 246); // Very soft pastel green/teal
    doc.roundedRect(pageWidth - margin - 48, 12, 48, 14, 1.5, 1.5, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("FOLIO DOCUMENTO", pageWidth - margin - 44, 16.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(180, 40, 60); // Red color for Folio code
    doc.text(interview.folio, pageWidth - margin - 44, 22.5);

    // 4. Header dividing line
    doc.setDrawColor(210, 225, 222);
    doc.setLineWidth(0.4);
    doc.line(margin, 29, pageWidth - margin, 29);
  };

  /**
   * Helper to check vertical limits and spawn a new page if necessary
   */
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 36; // Lower initial Y for secondary pages to clear the header
      return true;
    }
    return false;
  };

  // --- BEGIN DRAWING CONTENT ---

  // Page 1 initial setup
  drawPageHeader(1);
  currentY = 36;

  // Title of the Report
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 74, 69);
  doc.text("REGISTRO DE ENTREVISTA / ACTUACIÓN ESCOLAR", pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  // 1. PARTICIPANTS METADATA GRID (TABLE)
  const drawSecHeader = (title: string) => {
    checkPageBreak(12);
    doc.setFillColor(232, 242, 239); // Light teal header
    doc.rect(margin, currentY, contentWidth, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(12, 54, 50); // Deep forest green
    doc.text(title, margin + 3, currentY + 4.5);
    currentY += 8.5;
  };

  drawSecHeader("I. INDIVIDUALIZACIÓN DE LA ENTREVISTA / PARTICIPANTES");
  
  // Create beautiful structural table for the participants
  const cellHeight = 7;
  const col1Width = 42;
  const col2Width = 45;
  const col3Width = 42;
  const col4Width = 45;

  const drawRow = (label1: string, val1: string, label2: string, val2: string) => {
    checkPageBreak(cellHeight + 2);

    // Cell backgrounds
    doc.setFillColor(248, 250, 250);
    doc.rect(margin, currentY, col1Width, cellHeight, "F");
    doc.rect(margin + col1Width + col2Width, currentY, col3Width, cellHeight, "F");

    // Outside borders
    doc.setDrawColor(210, 225, 222);
    doc.setLineWidth(0.2);
    doc.rect(margin, currentY, contentWidth, cellHeight);
    doc.line(margin + col1Width, currentY, margin + col1Width, currentY + cellHeight);
    doc.line(margin + col1Width + col2Width, currentY, margin + col1Width + col2Width, currentY + cellHeight);
    doc.line(margin + col1Width + col2Width + col3Width, currentY, margin + col1Width + col2Width + col3Width, currentY + cellHeight);

    // Text insertions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 80, 75);
    doc.text(label1, margin + 2, currentY + 4.5);
    doc.text(label2, margin + col1Width + col2Width + 2, currentY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    // Truncate/fits
    const fVal1 = val1.length > 42 ? val1.substring(0, 42) + "..." : val1;
    const fVal2 = val2.length > 42 ? val2.substring(0, 42) + "..." : val2;
    doc.text(fVal1, margin + col1Width + 2.5, currentY + 4.5);
    doc.text(fVal2, margin + col1Width + col2Width + col3Width + 2.5, currentY + 4.5);

    currentY += cellHeight;
  };

  drawRow("Estudiante:", interview.studentName, "Fecha de Reporte:", interview.date);
  drawRow("Curso:", interview.studentGrade, "Hora de Atención:", interview.time);
  drawRow("RUN Estudiante:", interview.studentRun || "No Registrado", "Entrevistador(a):", interview.interviewerName);
  drawRow("Apoderado(a)/Entrevistado:", interview.guardianName || "No Aplica", "Rol del Entrevistador:", interview.interviewerRole);
  if (interview.guardianName) {
    drawRow("RUN Apoderado:", interview.guardianRun || "No Registrado", "Relación / Parentezco:", interview.guardianRelationship || "No Registrado");
  }

  currentY += 5;

  // 2. MOTIVO DE ENTREVISTA SELECTOR RENDERER
  drawSecHeader("II. MOTIVO PRIORITARIO DE LA ENTREVISTA");
  
  // Custom box styling for marked Reason
  checkPageBreak(25);
  doc.setDrawColor(17, 74, 69);
  doc.setLineWidth(0.35);
  doc.setFillColor(252, 255, 254);
  doc.roundedRect(margin, currentY, contentWidth, 20, 1.2, 1.2, "FD");

  // Fetch the text representation
  let reasonText = "";
  if (interview.reasonId >= 1 && interview.reasonId <= 10) {
    reasonText = `${interview.reasonId}- ${INTERVIEW_REASONS[interview.reasonId - 1]}`;
    if ((interview.reasonId === 7 || interview.reasonId === 8 || interview.reasonId === 9) && interview.reasonCustomText) {
      reasonText += ` ${interview.reasonCustomText}`;
    }
  } else {
    reasonText = "Motivo de Entrevista no clasificado u otro motivo general.";
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 74, 69);
  doc.text("MOTIVO PROTOCOLIZADO SELECCIONADO:", margin + 4, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  
  const wrappedReasonLines = doc.splitTextToSize(reasonText, contentWidth - 8);
  doc.text(wrappedReasonLines, margin + 4, currentY + 9.5);
  
  currentY += 24;

  // Render text blocks dynamically checking for page break
  const drawTextBlock = (sectionTitle: string, userText: string) => {
    drawSecHeader(sectionTitle);
    
    // Split lines check
    const cleanText = userText ? userText.trim() : "No se registraron antecedentes en esta sección.";
    const wrappedText = doc.splitTextToSize(cleanText, contentWidth - 6);
    
    // Render loop per line to support page overflow gracefully
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    
    const lineHeight = 4.8;
    
    // Add border background container
    let textBlockYStart = currentY;
    let totalLinesHeight = wrappedText.length * lineHeight + 4;
    
    // Find how many lines can fit on current page, if not splits nicely
    for (let i = 0; i < wrappedText.length; i++) {
      checkPageBreak(lineHeight + 2);
      
      // Draw background border if first line or page reset
      if (doc.internal.pages[doc.internal.pages.length] !== undefined) {
        // Just drew page break
      }
      
      doc.text(wrappedText[i], margin + 2.5, currentY + 3.2);
      currentY += lineHeight;
    }
    
    currentY += 4; // Margin bottom after section
  };

  // 3. Contextualización breve de la entrevista
  drawTextBlock(
    "III. CONTEXTUALIZACIÓN BREVE (Qué sucedió, con quiénes sucedió y dónde sucedió)",
    interview.contextText
  );

  // 4. Antecedentes (Relato & Preguntas orientadas)
  checkPageBreak(12);
  drawSecHeader("IV. ANTECEDENTES Y RELATO DE LA ENTREVISTA (Registro de preguntas y respuestas)");
  
  if (interview.backgroundQuestions && interview.backgroundQuestions.length > 0) {
    interview.backgroundQuestions.forEach((qa, idx) => {
      checkPageBreak(18);

      // Question header box
      doc.setFillColor(245, 248, 247);
      doc.rect(margin, currentY, contentWidth, 5.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(17, 74, 69);
      doc.text(`Pregunta Nº ${idx + 1}: ${qa.question}`, margin + 3, currentY + 4);
      currentY += 6;

      // Answer Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(40, 40, 40);

      const wrappedAns = doc.splitTextToSize(qa.answer || "Sin respuesta.", contentWidth - 6);
      for (const line of wrappedAns) {
        checkPageBreak(4.5);
        doc.text(line, margin + 3, currentY + 3);
        currentY += 4.5;
      }
      currentY += 2.5;
    });
  } else {
    // If no explicit structured questions, print backgroundGeneralText
    if (interview.backgroundGeneralText) {
      const wrappedGeneral = doc.splitTextToSize(interview.backgroundGeneralText, contentWidth - 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      for (const line of wrappedGeneral) {
        checkPageBreak(4.5);
        doc.text(line, margin + 2, currentY + 3);
        currentY += 4.5;
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("No se registraron diálogos/preguntas estructuradas en este registro.", margin + 3, currentY + 3);
      currentY += 5;
    }
  }
  currentY += 2;

  // 5. Acuerdos y/o compromisos
  drawTextBlock(
    "V. ACUERDOS Y COMPROMISOS ADQUIRIDOS",
    interview.agreementsText
  );

  // 6. Medidas de apoyo pedagógico y psicosocial
  drawTextBlock(
    "VI. MEDIDAS DE APOYO PEDAGÓGICO Y/O PSICOSOCIAL",
    interview.supportMeasuresText
  );

  // 7. Seguimiento y evaluación
  checkPageBreak(12);
  drawSecHeader("VII. SEGUIMIENTO Y EVALUACIÓN DE COMPROMISOS ADQUIRIDOS");
  
  // Structured sub-table for follow-up details
  checkPageBreak(25);
  doc.setDrawColor(210, 225, 222);
  doc.setFillColor(252, 255, 254);
  doc.rect(margin, currentY, contentWidth, 18, "FD");
  doc.line(margin + 58, currentY, margin + 58, currentY + 18);
  doc.line(margin + 116, currentY, margin + 116, currentY + 18);

  // Column Headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 74, 69);
  doc.text("FECHA DE REVISIÓN:", margin + 3, currentY + 4);
  doc.text("MECANISMO DE CONTROL:", margin + 61, currentY + 4);
  doc.text("RESPONSABLE DESIGNADO:", margin + 119, currentY + 4);

  // Values
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text(interview.followUpDate || "Pendiente definir", margin + 3, currentY + 10);
  
  const wrappedMech = doc.splitTextToSize(interview.followUpMechanism || "No definido", 52);
  doc.text(wrappedMech, margin + 61, currentY + 9);

  const wrappedResp = doc.splitTextToSize(interview.followUpResponsible || "No definido", 52);
  doc.text(wrappedResp, margin + 119, currentY + 9);

  currentY += 24;

  // 8. LEGAL NOTICE & SIGNATURE BLOCKS AT END OF DOCUMENT
  checkPageBreak(40);
  
  // Separation notice
  doc.setDrawColor(220, 230, 228);
  doc.setLineWidth(0.15);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  const disclaimer = "En comprobante de conformidad de lo tratado en esta citación, firman conjuntamente los participantes involucrados en la fecha estipulada como constancia mutua del compromiso. Los datos aquí contenidos de carácter psicosocial están amparados bajo estrictas medidas de reserva de información del establecimiento educativo.";
  const wrappedDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(wrappedDisclaimer, margin, currentY);
  currentY += 12;

  // Signature horizontal boxes
  checkPageBreak(25);
  const sigY = currentY + 15;
  
  doc.setDrawColor(150, 170, 165);
  doc.setLineWidth(0.3);
  
  // Left Line (Entrevistador)
  doc.line(margin + 6, sigY, margin + 66, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text("Firma Entrevistador(a)", margin + 36, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(interview.interviewerName, margin + 36, sigY + 8, { align: "center" });
  doc.text(`RUT / Firma`, margin + 36, sigY + 11, { align: "center" });

  // Right Line (Entrevistado / Apoderado)
  doc.line(pageWidth - margin - 66, sigY, pageWidth - margin - 6, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text("Firma Apoderado / Estudiante", pageWidth - margin - 36, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(interview.guardianName || interview.studentName, pageWidth - margin - 36, sigY + 8, { align: "center" });
  doc.text("Firma / Huella dactilar", pageWidth - margin - 36, sigY + 11, { align: "center" });

  // --- LAST STEP: WRITE RUNNING PAGE NUMBER FOOTERS ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // We rewrite headers on secondary pages because we added pages dynamically on spill
    if (i > 1) {
      drawPageHeader(i);
    }

    // Draw Footer Divider
    doc.setDrawColor(225, 235, 232);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Draw page folio metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Folio Certificación: ${interview.folio}`, margin, pageHeight - 8.5);
    
    // Confidential label
    doc.setFont("helvetica", "italic");
    doc.text("DOCUMENTO RESERVADO Y CONFIDENCIAL - COLEGIO CREE", pageWidth / 2, pageHeight - 8.5, { align: "center" });

    // Page count
    doc.setFont("helvetica", "bold");
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8.5, { align: "right" });
  }

  // Output as dynamic Blob
  return doc.output("blob");
}
