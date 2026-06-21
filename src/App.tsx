/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Search, 
  FileText, 
  CheckCircle, 
  CloudCheck, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Sliders, 
  Download, 
  Upload, 
  Layers, 
  Calendar, 
  Clock, 
  User, 
  Users, 
  ChevronRight, 
  Check, 
  X, 
  ArrowLeft, 
  Clipboard, 
  ExternalLink,
  Settings,
  HelpCircle,
  FileDown,
  CloudUpload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Interview, QuestionAnswer, SchoolInfo } from "./types";
import { getLogoDataUrl } from "./lib/schoolLogo";
import { generateInterviewPDF, INTERVIEW_REASONS } from "./lib/pdfGenerator";
import { getOrCreateFolder, uploadJsonFile, uploadPdfFile, deleteDriveFile } from "./lib/drive";

// Default school data
const DEFAULT_SCHOOL: SchoolInfo = {
  name: "Colegio CREE Cerro Navia",
  subName: "Área de Convivencia Escolar",
  address: "Av. Neptuno 1150, Cerro Navia",
  rut: "76.452.123-K"
};

export default function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<"dashboard" | "form" | "config">("dashboard");
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);

  // Core Data State (cached locally)
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [folioPrefix, setFolioPrefix] = useState<string>("CREE-2026-");
  const [nextFolioSeq, setNextFolioSeq] = useState<number>(42);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(DEFAULT_SCHOOL);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterReason, setFilterReason] = useState<string>("all");
  const [filterSync, setFilterSync] = useState<string>("all");

  // Google Drive Connection State
  const [driveClientId, setDriveClientId] = useState<string>(() => {
    return localStorage.getItem("cree_drive_client_id") || "";
  });
  const [driveToken, setDriveToken] = useState<string | null>(() => {
    return sessionStorage.getItem("cree_drive_token") || null;
  });
  const [driveUserName, setDriveUserName] = useState<string | null>(() => {
    return sessionStorage.getItem("cree_drive_user_name") || null;
  });
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem("cree_drive_user_email") || null;
  });
  const [driveStatusMsg, setDriveStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);

  // Status Alerts
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Form Wizard Steps state
  const [formStep, setFormStep] = useState<number>(1);

  // Form Inputs State
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formFolio, setFormFolio] = useState("");
  const [formStudentName, setFormStudentName] = useState("");
  const [formStudentGrade, setFormStudentGrade] = useState("");
  const [formStudentRun, setFormStudentRun] = useState("");
  const [formGuardianName, setFormGuardianName] = useState("");
  const [formGuardianRun, setFormGuardianRun] = useState("");
  const [formGuardianRelationship, setFormGuardianRelationship] = useState("");
  const [formInterviewerName, setFormInterviewerName] = useState("");
  const [formInterviewerRole, setFormInterviewerRole] = useState("");
  
  const [formReasonId, setFormReasonId] = useState<number>(1);
  const [formReasonCustomText, setFormReasonCustomText] = useState("");
  const [formContextText, setFormContextText] = useState("");
  const [formBackgroundQuestions, setFormBackgroundQuestions] = useState<QuestionAnswer[]>([
    { id: "1", question: "¿Qué sucedió desde tu perspectiva?", answer: "" },
    { id: "2", question: "¿Hubo otros participantes, descargos o comentarios del estudiante y/o apoderado?", answer: "" }
  ]);
  const [formBackgroundGeneralText, setFormBackgroundGeneralText] = useState("");
  const [formAgreementsText, setFormAgreementsText] = useState("");
  const [formSupportMeasuresText, setFormSupportMeasuresText] = useState("");
  const [formFollowUpDate, setFormFollowUpDate] = useState("");
  const [formFollowUpMechanism, setFormFollowUpMechanism] = useState("");
  const [formFollowUpResponsible, setFormFollowUpResponsible] = useState("");

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LIFECYCLE & CACHE ---
  useEffect(() => {
    // Load local storage items
    const cachedInterviews = localStorage.getItem("cree_interviews");
    const cachedPrefix = localStorage.getItem("cree_folio_prefix");
    const cachedSeq = localStorage.getItem("cree_folio_seq");
    const cachedSchool = localStorage.getItem("cree_school_info");

    if (cachedInterviews) {
      try {
        setInterviews(JSON.parse(cachedInterviews));
      } catch (e) {
        console.error("Failed to parse interviews from cache", e);
      }
    } else {
      // Seed initial dummy interview for a stunning visual start
      const seedInterview: Interview = {
        id: "seed-1",
        folio: "CREE-2026-041",
        date: "2026-06-12",
        time: "10:30",
        studentName: "Benjamin Rojas Silva",
        studentGrade: "7º Básico A",
        studentRun: "22.341.229-4",
        guardianName: "María Silva Troncoso",
        guardianRun: "13.412.004-9",
        guardianRelationship: "Madre",
        interviewerName: "Prof. Alejandro Valdés",
        interviewerRole: "Coordinador de Convivencia Escolar",
        reasonId: 1,
        reasonCustomText: "",
        contextText: "El estudiante Benjamín Rojas se vio involucrado en una discusión verbal con empujones en el patio principal del colegio durante el segundo recreo con un compañero de curso, lo que alertó a inspectores de patio.",
        backgroundQuestions: [
          { id: "s-1", question: "¿Qué detonó el suceso en el patio?", answer: "Menciona que fue una broma que se salió de control respecto a un balón de fútbol, provocando enojo recíproco." },
          { id: "s-2", question: "¿Se ha conversado previamente con el apoderado?", answer: "Sí, es el segundo llamado de atención leve en el semestre." }
        ],
        agreementsText: "El estudiante se compromete a pedir disculpas públicas a su compañero de juego y abstenerse de usar empujones en los recreos. La madre firma el compromiso de dialogar en el hogar sobre autorregulación.",
        supportMeasuresText: "- Citación conjunta de mediación escolar con encargado de convivencia.\n- Derivación optativa a taller de resolución pacífica de conflictos.",
        followUpDate: "2026-06-25",
        followUpMechanism: "Revisión verbal semanal del estado del clima escolar en sala con profesor jefe.",
        followUpResponsible: "Prof. Alejandro Valdés",
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        syncedToDrive: false
      };
      setInterviews([seedInterview]);
      localStorage.setItem("cree_interviews", JSON.stringify([seedInterview]));
    }

    if (cachedPrefix) setFolioPrefix(cachedPrefix);
    if (cachedSeq) setNextFolioSeq(parseInt(cachedSeq, 10));
    if (cachedSchool) {
      try {
        setSchoolInfo(JSON.parse(cachedSchool));
      } catch (e) {}
    }

    // Check Google Drive implicit grant returned token in hash
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        setDriveToken(token);
        sessionStorage.setItem("cree_drive_token", token);
        
        // Fetch user info for a nice customized welcome
        fetchProfileInfo(token);
        
        // Clean URL hash
        window.history.replaceState(null, "", window.location.pathname);
        showPrompt("¡Conectado exitosamente con Google Drive!", "success");
      }
    }
  }, []);

  // Sync state helpers
  const saveInterviewsToLocal = (newInterviews: Interview[]) => {
    setInterviews(newInterviews);
    localStorage.setItem("cree_interviews", JSON.stringify(newInterviews));
  };

  const showPrompt = (message: string, type: "success" | "error" | "info" = "info") => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  // --- FETCH USER GOOGLE PROFILE ---
  const fetchProfileInfo = async (token: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDriveUserName(data.name || "Usuario CREE");
        setDriveUserEmail(data.email || "");
        sessionStorage.setItem("cree_drive_user_name", data.name || "Usuario CREE");
        sessionStorage.setItem("cree_drive_user_email", data.email || "");
      }
    } catch (e) {
      console.warn("Could not retrieve Google profile details", e);
    }
  };

  // --- GOOGLE DRIVE OAUTH LOGOUT / LOGIN ---
  const handleDriveConnect = () => {
    if (!driveClientId) {
      showPrompt("Por favor ingresa un Client ID de Google válido en Configuración.", "error");
      setCurrentTab("config");
      return;
    }

    // Store in local storage
    localStorage.setItem("cree_drive_client_id", driveClientId);

    // Dynamic implicit grant redirect
    const redirectUri = window.location.origin;
    const scopes = "https://www.googleapis.com/auth/drive.file";
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(driveClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=select_account`;
    
    // Warn user about iframe context
    if (window.self !== window.top) {
      if (window.confirm("¿Te encuentras en la previsualización directa de AI Studio? Para que el login de Google funcione correctamente, sugerimos abrir primero la App en una pestaña nueva usando el botón en la barra superior. ¿Deseas continuar de todas formas?")) {
        window.top!.location.href = oauthUrl;
      }
    } else {
      window.location.href = oauthUrl;
    }
  };

  const handleDriveDisconnect = () => {
    setDriveToken(null);
    setDriveUserName(null);
    setDriveUserEmail(null);
    sessionStorage.removeItem("cree_drive_token");
    sessionStorage.removeItem("cree_drive_user_name");
    sessionStorage.removeItem("cree_drive_user_email");
    showPrompt("Sincronización de Google Drive desactivada de la sesión.", "info");
  };

  // --- DRIVE SYNC CORE OPERATOR ---
  const syncInterviewToDrive = async (interview: Interview, forceAlert = true) => {
    if (!driveToken) {
      if (forceAlert) showPrompt("No se ha autenticado tu cuenta Google Drive. Regístrate en el panel superior.", "error");
      return;
    }

    setIsSyncingId(interview.id);
    try {
      // 1. Seek / Create parent root folder "CREE_Entrevistas"
      const parentFolderId = await getOrCreateFolder(driveToken, "CREE_Entrevistas_App");
      
      // 2. Seek / Create child folder "JSON_Registros" and "PDF_Reportes"
      const jsonFolderId = await getOrCreateFolder(driveToken, "JSON_Registros", parentFolderId);
      const pdfFolderId = await getOrCreateFolder(driveToken, "PDF_Reportes", parentFolderId);

      // 3. Serialize and save the JSON model of the interview
      const jsonFileName = `CREE_Entrevista_${interview.folio}_${interview.studentName.replace(/\s+/g, "_")}.json`;
      const jsonId = await uploadJsonFile(
        driveToken, 
        jsonFileName, 
        JSON.stringify(interview, null, 2), 
        jsonFolderId
      );

      // 4. Generate the direct PDF output
      const pdfBlob = generateInterviewPDF(interview);
      const pdfFileName = `CREE_Entrevista_${interview.folio}_${interview.studentName.replace(/\s+/g, "_")}.pdf`;
      const pdfId = await uploadPdfFile(
        driveToken, 
        pdfFileName, 
        pdfBlob, 
        pdfFolderId
      );

      // 5. Update local record with synced flag
      const updatedList = interviews.map((item) => {
        if (item.id === interview.id) {
          return {
            ...item,
            syncedToDrive: true,
            driveFileId: jsonId // Linked to central json backup ID
          };
        }
        return item;
      });

      saveInterviewsToLocal(updatedList);
      setIsSyncingId(null);
      if (forceAlert) showPrompt(`Documento ${interview.folio} sincronizado correctamente en Drive (Carpeta: CREE_Entrevistas_App).`, "success");
    } catch (err: any) {
      console.error("Drive synchronization failed", err);
      setIsSyncingId(null);
      if (forceAlert) showPrompt(`Fallo de Sincronización: ${err.message}`, "error");
    }
  };

  // Sync All Unsynced Documents helper
  const handleSyncAll = async () => {
    if (!driveToken) {
      showPrompt("Debes conectarte a Drive para sincronizar todos los expedientes.", "error");
      return;
    }
    const unsynced = interviews.filter(item => !item.syncedToDrive);
    if (unsynced.length === 0) {
      showPrompt("Todos los documentos ya se encuentran respaldados en la nube.", "info");
      return;
    }

    let successCount = 0;
    showPrompt(`Iniciando respaldo masivo de ${unsynced.length} documentos...`, "info");

    for (const doc of unsynced) {
      try {
        await syncInterviewToDrive(doc, false);
        successCount++;
      } catch (e) {
        console.error("Error backing up index Item", doc.folio, e);
      }
    }

    showPrompt(`Sincronización terminada: ${successCount} de ${unsynced.length} subidos con éxito.`, "success");
  };

  // --- FORM MANIPULATIONS ---
  const triggerNewForm = () => {
    const today = new Date().toISOString().split("T")[0];
    const rawTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
    
    // Generate suggest auto-folio
    const proposedFolio = `${folioPrefix}${String(nextFolioSeq).padStart(3, "0")}`;

    setEditingInterview(null);
    setFormStep(1);

    // Pre-populate fields
    setFormDate(today);
    setFormTime(rawTime);
    setFormFolio(proposedFolio);
    setFormStudentName("");
    setFormStudentGrade("");
    setFormStudentRun("");
    setFormGuardianName("");
    setFormGuardianRun("");
    setFormGuardianRelationship("");
    setFormInterviewerName("");
    setFormInterviewerRole("");
    setFormReasonId(1);
    setFormReasonCustomText("");
    setFormContextText("");
    setFormBackgroundQuestions([
      { id: "1", question: "¿Qué sucedió en la situación descrita?", answer: "" },
      { id: "2", question: "¿Qué descargos, acuerdos o explicaciones preliminares entrega el estudiante y/o el apoderado?", answer: "" }
    ]);
    setFormBackgroundGeneralText("");
    setFormAgreementsText("");
    setFormSupportMeasuresText("");
    setFormFollowUpDate("");
    setFormFollowUpMechanism("");
    setFormFollowUpResponsible("");

    setCurrentTab("form");
  };

  const triggerEditForm = (item: Interview) => {
    setEditingInterview(item);
    setFormStep(1);

    setFormDate(item.date);
    setFormTime(item.time);
    setFormFolio(item.folio);
    setFormStudentName(item.studentName);
    setFormStudentGrade(item.studentGrade);
    setFormStudentRun(item.studentRun || "");
    setFormGuardianName(item.guardianName || "");
    setFormGuardianRun(item.guardianRun || "");
    setFormGuardianRelationship(item.guardianRelationship || "");
    setFormInterviewerName(item.interviewerName);
    setFormInterviewerRole(item.interviewerRole);
    setFormReasonId(item.reasonId);
    setFormReasonCustomText(item.reasonCustomText || "");
    setFormContextText(item.contextText);
    setFormBackgroundQuestions(item.backgroundQuestions || []);
    setFormBackgroundGeneralText(item.backgroundGeneralText || "");
    setFormAgreementsText(item.agreementsText);
    setFormSupportMeasuresText(item.supportMeasuresText);
    setFormFollowUpDate(item.followUpDate || "");
    setFormFollowUpMechanism(item.followUpMechanism || "");
    setFormFollowUpResponsible(item.followUpResponsible || "");

    setCurrentTab("form");
  };

  // Add Question QA record inside editing form
  const handleAddNewQuestion = () => {
    const nextId = String(formBackgroundQuestions.length + 1);
    setFormBackgroundQuestions([
      ...formBackgroundQuestions,
      { id: nextId, question: "¿Pregunta del entrevistador?", answer: "" }
    ]);
  };

  const handleUpdateQA = (index: number, key: "question" | "answer", val: string) => {
    const updated = [...formBackgroundQuestions];
    updated[index][key] = val;
    setFormBackgroundQuestions(updated);
  };

  const handleRemoveQA = (idx: number) => {
    const updated = formBackgroundQuestions.filter((_, i) => i !== idx);
    setFormBackgroundQuestions(updated);
  };

  // Submit and save the form contents
  const handleSaveForm = (syncAfterSave = false) => {
    // Validations
    if (!formStudentName.trim() || !formStudentGrade.trim() || !formInterviewerName.trim()) {
      showPrompt("Los campos: Estudiante, Curso e Interviewer Name son obligatorios.", "error");
      setFormStep(1);
      return;
    }
    if (!formFolio.trim()) {
      showPrompt("El folio de la entrevista es obligatorio para su archivo.", "error");
      setFormStep(1);
      return;
    }

    // Check if folio is already used in another document
    const isFolioUsed = interviews.some(item => item.folio === formFolio && (!editingInterview || item.id !== editingInterview.id));
    if (isFolioUsed) {
      if (!window.confirm(`Atención: El folio [${formFolio}] ya se encuentra registrado en otro reporte. ¿Deseas guardarlo con el mismo folio duplicado de todas formas?`)) {
        return;
      }
    }

    const payload: Interview = {
      id: editingInterview ? editingInterview.id : `int-${Date.now()}`,
      folio: formFolio,
      date: formDate,
      time: formTime,
      studentName: formStudentName,
      studentGrade: formStudentGrade,
      studentRun: formStudentRun,
      guardianName: formGuardianName,
      guardianRun: formGuardianRun,
      guardianRelationship: formGuardianRelationship,
      interviewerName: formInterviewerName,
      interviewerRole: formInterviewerRole,
      reasonId: formReasonId,
      reasonCustomText: formReasonCustomText,
      contextText: formContextText,
      backgroundQuestions: formBackgroundQuestions,
      backgroundGeneralText: formBackgroundGeneralText,
      agreementsText: formAgreementsText,
      supportMeasuresText: formSupportMeasuresText,
      followUpDate: formFollowUpDate,
      followUpMechanism: formFollowUpMechanism,
      followUpResponsible: formFollowUpResponsible,
      createdAt: editingInterview ? editingInterview.createdAt : Date.now(),
      updatedAt: Date.now(),
      syncedToDrive: editingInterview ? editingInterview.syncedToDrive : false,
      driveFileId: editingInterview ? editingInterview.driveFileId : undefined
    };

    let updatedList: Interview[];
    if (editingInterview) {
      updatedList = interviews.map(item => item.id === editingInterview.id ? payload : item);
      showPrompt(`Entrevista con Folio ${formFolio} actualizada localmente.`, "success");
    } else {
      updatedList = [payload, ...interviews];
      // Increment auto SEQ
      const newSeq = nextFolioSeq + 1;
      setNextFolioSeq(newSeq);
      localStorage.setItem("cree_folio_seq", String(newSeq));
      showPrompt(`Nueva entrevista guardada exitosamente bajo el Folio ${formFolio}.`, "success");
    }

    saveInterviewsToLocal(updatedList);
    setCurrentTab("dashboard");

    // Optional follow-up Drive sync action
    if (syncAfterSave && driveToken) {
      syncInterviewToDrive(payload);
    }
  };

  // --- EXPORT REVEALING LOCAL PDF ---
  const triggerPdfExport = (item: Interview) => {
    try {
      const parentFolderLogo = getLogoDataUrl(250, 250);
      const pdfBlob = generateInterviewPDF(item, parentFolderLogo);
      
      const fileUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `Reporte_Entrevista_CREE_${item.folio}_${item.studentName.replace(/\s+/g,"_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showPrompt(`PDF generado correctamente para el Folio ${item.folio}.`, "success");
    } catch (e: any) {
      showPrompt(`Error al compilar el PDF: ${e.message}`, "error");
    }
  };

  // --- DELETE INTERVIEW ---
  const handleDeleteInterview = (item: Interview) => {
    const confirmMsg = `¿Estás absolutamente seguro de eliminar el registro de entrevista del estudiante ${item.studentName} (Folio: ${item.folio})?\nEsta acción es irreversible en la base de datos local.`;
    if (!window.confirm(confirmMsg)) return;

    const filtered = interviews.filter(doc => doc.id !== item.id);
    saveInterviewsToLocal(filtered);
    showPrompt(`Expediente ${item.folio} eliminado localmente.`, "info");

    // If synced up in drive, ask if they want to wipe from drive as well
    if (item.syncedToDrive && item.driveFileId && driveToken) {
      if (window.confirm(`Este documento también fue respaldado en Google Drive. ¿Deseas que lo eliminemos de tu nube ahora mismo?`)) {
        deleteDriveFile(driveToken, item.driveFileId)
          .then(() => showPrompt(`Se ha depurado el respaldo vinculante de Google Drive.`, "success"))
          .catch((e) => console.warn("Failed delete linked file", e));
      }
    }
  };

  // --- BACKUP ACTIONS ---
  const handleExportDatabase = () => {
    const dbBlob = new Blob([JSON.stringify(interviews, null, 2)], { type: "application/json" });
    const fileUrl = URL.createObjectURL(dbBlob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `Respaldo_Base_Entrevistas_CREE_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    showPrompt("Base de datos descargada como archivo de seguridad JSON.", "success");
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const text = loadEvent.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          if (window.confirm(`Se han detectado ${parsed.length} entrevistas en este archivo. ¿Deseas fusionarlos con tus ${interviews.length} entrevistas actuales?`)) {
            // Merge matching IDs if any, avoiding duplicate items
            const merged = [...interviews];
            parsed.forEach((importedItem: any) => {
              if (importedItem.id && importedItem.folio) {
                const existingIdx = merged.findIndex(v => v.id === importedItem.id || v.folio === importedItem.folio);
                if (existingIdx !== -1) {
                  merged[existingIdx] = { ...merged[existingIdx], ...importedItem };
                } else {
                  merged.push(importedItem as Interview);
                }
              }
            });
            saveInterviewsToLocal(merged);
            showPrompt("Respaldo consolidado exitosamente en el equipo.", "success");
          }
        } else {
          showPrompt("Formato incorrecto. El respaldo debe ser una colección JSON.", "error");
        }
      } catch (err: any) {
        showPrompt(`La lectura del archivo base falló: ${err.message}`, "error");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- QUERY FILTER LOGIC ---
  const filteredInterviews = interviews.filter(item => {
    const studentMatch = item.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const folioMatch = item.folio.toLowerCase().includes(searchTerm.toLowerCase());
    const gradeMatch = item.studentGrade.toLowerCase().includes(searchTerm.toLowerCase());
    const interviewerMatch = item.interviewerName.toLowerCase().includes(searchTerm.toLowerCase());
    const guardianMatch = (item.guardianName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const searchMatch = studentMatch || folioMatch || gradeMatch || interviewerMatch || guardianMatch;

    const reasonNum = parseInt(filterReason, 10);
    const reasonMatch = filterReason === "all" || item.reasonId === reasonNum;

    let syncMatch = true;
    if (filterSync === "synced") syncMatch = item.syncedToDrive === true;
    if (filterSync === "unsynced") syncMatch = !item.syncedToDrive;

    return searchMatch && reasonMatch && syncMatch;
  });

  // Calculate quick stats totals
  const totalCount = interviews.length;
  const syncedCount = interviews.filter(v => v.syncedToDrive).length;
  const unsyncedCount = totalCount - syncedCount;

  // Active theme classes - Forest school colors
  const primaryTeal = "bg-teal-800 hover:bg-teal-900 text-white";
  const borderTeal = "border-teal-800";
  const textTeal = "text-teal-800";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">
      
      {/* 1. TOP NAV BAR WITH SCHOOL BRAND & AUTH */}
      <nav className="bg-gradient-to-r from-teal-900 to-emerald-950 text-white shadow-md border-b border-teal-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setCurrentTab("dashboard")}>
            {/* Inline SVG rendering of the CREE logo for fidelity */}
            <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shadow">
              <svg viewBox="0 0 500 500" className="w-10 h-10">
                {/* Visual depiction of hands-holding kids */}
                <path d="M60 160 Q 90 165, 115 155 T 125 135" stroke="#111" strokeWidth="12" fill="none" strokeLinecap="round" />
                <path d="M175 130 Q 195 120, 215 120 T 235 130" stroke="#111" strokeWidth="12" fill="none" strokeLinecap="round" />
                <path d="M275 135 Q 285 155, 310 165 T 340 160" stroke="#111" strokeWidth="12" fill="none" strokeLinecap="round" />
                {/* Kid 1 - Teal */}
                <circle cx="50" cy="150" r="22" stroke="#111" strokeWidth="10" fill="#FFF" />
                <path d="M35 210 L50 175 L65 210" stroke="#111" strokeWidth="10" fill="none" />
                <rect x="35" y="175" width="30" height="35" fill="#00a18e" stroke="#111" strokeWidth="10" />
                {/* Kid 2 - Green */}
                <circle cx="150" cy="120" r="22" stroke="#111" strokeWidth="10" fill="#FFF" />
                <path d="M140 180 L150 145 L160 180" stroke="#111" strokeWidth="10" fill="none" />
                <rect x="140" y="145" width="20" height="35" fill="#7cac54" stroke="#111" strokeWidth="10" />
                {/* Kid 3 - Orange */}
                <circle cx="255" cy="120" r="22" stroke="#111" strokeWidth="10" fill="#FFF" />
                <path d="M245 180 L255 145 L265 180" stroke="#111" strokeWidth="10" fill="none" />
                <rect x="245" y="145" width="20" height="35" fill="#f3903f" stroke="#111" strokeWidth="10" />
                {/* Kid 4 - Pink */}
                <circle cx="350" cy="150" r="22" stroke="#111" strokeWidth="10" fill="#FFF" />
                <path d="M335 210 L350 175 L365 210" stroke="#111" strokeWidth="10" fill="none" />
                <rect x="335" y="175" width="30" height="35" fill="#ce3450" stroke="#111" strokeWidth="10" />
              </svg>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg md:text-xl tracking-tight leading-none uppercase">CREE Fichero</h1>
                <span className="bg-teal-600/50 text-[10px] font-semibold text-emerald-300 px-1.5 py-0.5 rounded border border-teal-500/30">
                  Drive Sync v1
                </span>
              </div>
              <p className="text-xs text-teal-200">{schoolInfo.name} • Convivencia Escolar</p>
            </div>
          </div>

          {/* Drive status bar connection controller */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {driveToken ? (
              <div className="flex items-center gap-3 bg-teal-900/60 p-2 rounded-lg border border-teal-700/65">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-emerald-300 flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 block"></span>
                    Sincronización Activa
                  </p>
                  <p className="text-[10px] text-teal-100/80">{driveUserEmail}</p>
                </div>
                <button 
                  onClick={handleDriveDisconnect}
                  className="bg-teal-700 hover:bg-teal-600 transition text-[11px] px-2.5 py-1.5 rounded font-medium border border-teal-500/30"
                  id="btn_desvincular_drive"
                >
                  Desvincular
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="text-[11px] text-emerald-200/90 leading-tight hidden lg:block text-right max-w-[200px]">
                  Configura tu Client ID en el panel y sincroniza el archivo en Drive.
                </div>
                <button
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 transition text-xs font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 shadow"
                  onClick={() => {
                    if (!driveClientId) {
                      showPrompt("Inserta tu Google Client ID en el panel de Configuración para activar Drive.", "info");
                      setCurrentTab("config");
                    } else {
                      handleDriveConnect();
                    }
                  }}
                  id="btn_conectar_drive"
                >
                  <CloudUpload className="w-4 h-4" />
                  Conectar Google Drive
                </button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* 2. SUB NAVIGATION LINKS AND ALERTS */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex justify-between items-center">
          
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition ${currentTab === "dashboard" ? "bg-white text-teal-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"}`}
              id="tab_listado"
            >
              <Layers className="w-3.5 h-3.5" />
              Bandeja de Entrevistas
            </button>
            <button
              onClick={triggerNewForm}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition ${currentTab === "form" ? "bg-white text-teal-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"}`}
              id="tab_nuevo_registro"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Ficha Actuación
            </button>
            <button
              onClick={() => setCurrentTab("config")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition ${currentTab === "config" ? "bg-white text-teal-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"}`}
              id="tab_configuracion"
            >
              <Settings className="w-3.5 h-3.5" />
              Configuración y Respaldos
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <label className="text-[11px] text-slate-500 font-medium">Auto-Folio Sequence:</label>
            <span className="font-mono text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded">
              {folioPrefix}{String(nextFolioSeq).padStart(3, "0")}
            </span>
          </div>

        </div>
      </header>

      {/* FLOAT PROMPT ALERTS */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 shadow-xl rounded-xl p-4 w-[90%] max-w-lg border flex gap-3 text-sm items-start ${
              alert.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                : alert.type === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-teal-50 border-teal-200 text-teal-900"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : alert.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold leading-none mb-1 text-[13px]">
                {alert.type === "success" ? "Operación Exitosa" : alert.type === "error" ? "Inconveniente Detectado" : "Notificación del Sistema"}
              </p>
              <p className="text-xs text-slate-600">{alert.message}</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600 ml-auto" onClick={() => setAlert(null)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. CENTRAL WRAPPER SECTION */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* VIEW A: DASHBOARD / SEED TABLE */}
        {currentTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold font-mono">Fichas de Entrevista</p>
                  <h3 className="text-2xl font-bold font-serif text-teal-950 mt-1">{totalCount}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Registradas localmente</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-teal-800 border border-teal-100">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold font-mono">Sincronizados Drive</p>
                  <h3 className="text-2xl font-bold font-serif text-emerald-800 mt-1">{syncedCount}</h3>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Carpeta central en Google Drive
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-800 border border-emerald-100">
                  <CloudCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold font-mono font-mono">Pendientes de Respaldo</p>
                  <h3 className="text-2xl font-bold font-serif text-amber-800 mt-1">{unsyncedCount}</h3>
                  {driveToken && unsyncedCount > 0 ? (
                    <button 
                      onClick={handleSyncAll}
                      className="text-[10px] text-white bg-amber-700 hover:bg-amber-800 px-2 py-0.5 rounded font-medium mt-1 inline-flex items-center gap-1 transition"
                    >
                      Respaldo Masivo
                    </button>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1">Requiere Google Drive conectado</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-800 border border-amber-100">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Main Data Section container */}
            <div className="bg-white shadow-xs border border-slate-200 rounded-xl overflow-hidden">
              
              {/* Table search & filter actions */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row gap-3.5 justify-between">
                
                {/* Search Bar */}
                <div className="relative group max-w-md w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-800 w-4 h-4 transition" />
                  <input
                    type="text"
                    placeholder="Buscar por estudiante, folio, curso o entrevistador..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-teal-700 group-hover:border-slate-300 transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-semibold font-mono">Motivo:</span>
                    <select
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-750"
                      value={filterReason}
                      onChange={(e) => setFilterReason(e.target.value)}
                    >
                      <option value="all">Ver Todos los Motivos (1 - 10)</option>
                      {INTERVIEW_REASONS.map((reason, index) => (
                        <option key={index} value={String(index + 1)}>
                          {index + 1}- Escenario {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-semibold font-mono">Sync:</span>
                    <select
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-750"
                      value={filterSync}
                      onChange={(e) => setFilterSync(e.target.value)}
                    >
                      <option value="all">Sincronización (Todos)</option>
                      <option value="synced">Resguardado en Drive</option>
                      <option value="unsynced">Solo Local (Offline)</option>
                    </select>
                  </div>

                  {/* Add New Report Button */}
                  <button
                    onClick={triggerNewForm}
                    className="bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition ml-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Ficha
                  </button>
                </div>

              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-[12px]">
                  <thead className="bg-slate-50/50 uppercase tracking-wider font-mono text-[10px] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold">Folio</th>
                      <th className="px-5 py-3 text-left font-bold">Estudiante / Curso</th>
                      <th className="px-5 py-3 text-left font-bold">Encargado Entrevista</th>
                      <th className="px-5 py-3 text-left font-bold">Motivo Escolar</th>
                      <th className="px-5 py-3 text-left font-bold">Atención</th>
                      <th className="px-5 py-3 text-center font-bold">Nube Drive</th>
                      <th className="px-5 py-3 text-right font-bold">Acciones de Archivo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredInterviews.length > 0 ? (
                      filteredInterviews.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-100">
                              {item.folio}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-semibold text-slate-900">{item.studentName}</p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Users className="w-3 h-3 block" />
                                {item.studentGrade} {item.studentRun ? `| RUN: ${item.studentRun}` : ""}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-medium text-slate-800">{item.interviewerName}</p>
                              <p className="text-[10px] text-slate-400">{item.interviewerRole}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 max-w-xs truncate">
                            <span 
                              className="inline-block truncate max-w-full font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded"
                              title={`${item.reasonId}- ${INTERVIEW_REASONS[item.reasonId - 1]}`}
                            >
                              <span className="font-bold text-teal-800 mr-1">#{item.reasonId}</span> 
                              {INTERVIEW_REASONS[item.reasonId - 1]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-[11px] text-slate-600">
                              <Calendar className="w-3 h-3" />
                              {item.date} <span className="text-[10px] text-slate-400">{item.time}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            {item.syncedToDrive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Respaldado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Solo Local
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                            <div className="flex justify-end items-center gap-1.5">
                              {/* Sync and Download actions */}
                              <button
                                onClick={() => triggerPdfExport(item)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                title="Exportar PDF Local"
                                id={`btn_export_pdf_${item.folio}`}
                              >
                                <FileDown className="w-4 h-4" />
                              </button>

                              {driveToken && (
                                <button
                                  onClick={() => syncInterviewToDrive(item)}
                                  className={`p-1.5 rounded-lg transition ${
                                    isSyncingId === item.id 
                                      ? "bg-teal-50 text-teal-800" 
                                      : item.syncedToDrive 
                                        ? "bg-slate-100 hover:bg-slate-200 text-emerald-600" 
                                        : "bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-100"
                                  }`}
                                  disabled={isSyncingId === item.id}
                                  title={item.syncedToDrive ? "Sincronizado (Forzar re-envío)" : "Sincronizar a Google Drive"}
                                  id={`btn_sync_drive_${item.folio}`}
                                >
                                  <CloudUpload className={`w-4 h-4 ${isSyncingId === item.id ? "animate-spin" : ""}`} />
                                </button>
                              )}

                              {/* Edit or Delete */}
                              <button
                                onClick={() => triggerEditForm(item)}
                                className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-transparent hover:border-teal-100 text-indigo-700 rounded-lg transition"
                                title="Editar expedientes"
                                id={`btn_edit_${item.folio}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteInterview(item)}
                                className="p-1.5 bg-slate-100 hover:bg-red-50 text-red-600 rounded-lg transition"
                                title="Eliminar registro"
                                id={`btn_delete_${item.folio}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500 font-medium">
                          <div className="max-w-sm mx-auto space-y-2">
                            <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                            <p className="text-slate-600 font-bold">No se encontraron expedientes</p>
                            <p className="text-xs text-slate-400">Intenta modificando los filtros o redacta una nueva entrevista escolar.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table stats notice bar */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between font-medium">
                <span>Mostrando {filteredInterviews.length} de {totalCount} entrevistas indexadas</span>
                <span>CREE Cerro Navia Convivencia Escolar</span>
              </div>

            </div>

          </div>
        )}

        {/* VIEW B: CREATION / EDITING FORM WINDOW */}
        {currentTab === "form" && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            
            {/* Header Form panel */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <button
                  onClick={() => {
                    if (window.confirm("¿Seguro que deseas salir del borrador actual? Los cambios no guardados se perderán.")) {
                      setCurrentTab("dashboard");
                    }
                  }}
                  className="text-xs font-semibold text-teal-800 hover:text-teal-950 flex items-center gap-1.5 mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver a la Bandeja
                </button>
                <h2 className="text-lg font-bold font-serif text-slate-900">
                  {editingInterview ? `Editando Ficha de Actuación: Folio ${editingInterview.folio}` : "Registro de Intervención y Toma de Entrevista"}
                </h2>
                <p className="text-xs text-slate-500">Llene todos los hitos y exporte de manera directa a PDF en el colegio.</p>
              </div>

              {/* Steps indicators */}
              <div className="flex gap-2.5">
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <button
                    key={stepNum}
                    onClick={() => setFormStep(stepNum)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                      formStep === stepNum 
                        ? "bg-teal-800 text-white shadow-xs" 
                        : formStep > stepNum 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-100 border" 
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {formStep > stepNum ? <Check className="w-4 h-4" /> : stepNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields body Content */}
            <div className="p-6">
              
              {/* STEP 1: PARTICIPANTS & FOLIO CONFIG */}
              {formStep === 1 && (
                <div className="space-y-6">
                  
                  <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl">
                    <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Sliders className="w-4 h-4" />
                      Casilla de Configuración del Folio y Fecha del Documento
                    </h3>
                    <p className="text-xs text-teal-850 mb-3">
                      Este código identificará al expediente de forma única. Se genera automáticamente basado en la secuencia global, pero puedes editarlo en este campo de configuración si requieres un folio especial.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Folio del Documento (Editable):</label>
                        <input
                          type="text"
                          required
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-teal-700 font-mono font-bold text-teal-950 uppercase"
                          value={formFolio}
                          placeholder="CREE-2026-XXX"
                          onChange={(e) => setFormFolio(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Entrevista:</label>
                        <div className="relative">
                          <input
                            type="date"
                            required
                            className="w-full p-2 pl-8 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                          />
                          <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Hora:</label>
                        <div className="relative">
                          <input
                            type="time"
                            required
                            className="w-full p-2 pl-8 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                            value={formTime}
                            onChange={(e) => setFormTime(e.target.value)}
                          />
                          <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Details Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5 uppercase font-mono mb-3.5 flex items-center gap-1">
                      <User className="w-4 h-4 text-slate-400" /> Datos del Estudiante
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Completo Estudiante *:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Benjamín Rojas Silva"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formStudentName}
                          onChange={(e) => setFormStudentName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Curso y Letra *:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: 7º Básico A"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formStudentGrade}
                          onChange={(e) => setFormStudentGrade(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">RUN Estudiante:</label>
                        <input
                          type="text"
                          placeholder="Ej: 22.341.229-4"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formStudentRun}
                          onChange={(e) => setFormStudentRun(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guardian details opt */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5 uppercase font-mono mb-3.5 flex items-center gap-1">
                      <Users className="w-4 h-4 text-slate-400" /> Identificación del Apoderado(a) / Entrevistado
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Completo Apoderado:</label>
                        <input
                          type="text"
                          placeholder="Ej: María Silva Troncoso"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formGuardianName}
                          onChange={(e) => setFormGuardianName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Parentezco / Relación:</label>
                        <input
                          type="text"
                          placeholder="Ej: Madre / Tutor Legal"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formGuardianRelationship}
                          onChange={(e) => setFormGuardianRelationship(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">RUN Apoderado:</label>
                        <input
                          type="text"
                          placeholder="Ej: 13.412.004-9"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formGuardianRun}
                          onChange={(e) => setFormGuardianRun(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interviewer details */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5 uppercase font-mono mb-3.5 flex items-center gap-1">
                      <User className="w-4 h-4 text-slate-400" /> Rol Encargado del Fichero
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre Entrevistador(a) *:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Prof. Alejandro Valdés"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formInterviewerName}
                          onChange={(e) => setFormInterviewerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cargo / Rol en el Establecimiento *:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Psicólogo Convivencia Escolar / Profesor Jefe"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                          value={formInterviewerRole}
                          onChange={(e) => setFormInterviewerRole(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 2: MOTIVE & CONTEXT BLOCK */}
              {formStep === 2 && (
                <div className="space-y-6">
                  
                  <div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs text-slate-500">
                      <p className="font-bold text-slate-700 mb-1 text-[11px]">TIPOS DE MOTIVOS DE ENTREVISTA EN EL REGLAMENTO INTERNO</p>
                      Selecciona uno de los 10 protocolos correspondientes a continuación. Los campos se estructurarán y estamparán fielmente en el PDF.
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {INTERVIEW_REASONS.map((reasonText, idx) => {
                        const optionNum = idx + 1;
                        return (
                          <label 
                            key={optionNum}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-[11.5px] cursor-pointer transition ${
                              formReasonId === optionNum
                                ? "bg-teal-50/70 border-teal-800 font-medium text-teal-900" 
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="reason_id"
                              className="mt-0.5 text-teal-850 focus:ring-teal-750"
                              checked={formReasonId === optionNum}
                              onChange={() => setFormReasonId(optionNum)}
                            />
                            <div className="flex-1">
                              <span className="font-bold text-teal-900 mr-1.5 font-mono">#{optionNum}</span> 
                              {reasonText}
                              
                              {/* Quick clipboard helper button in case they need to copy & paste */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(reasonText);
                                  showPrompt("Texto de motivo copiado al portapapeles.", "success");
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 font-semibold ml-2.5 inline-block cursor-pointer bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded"
                                title="Copiar este extracto literal para completar en otro procesador"
                              >
                                <Clipboard className="w-3 h-3 block" />
                                Copiar
                              </button>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Completion Text box if choosing 7, 8, 9 or customized additions */}
                  {(formReasonId === 7 || formReasonId === 8 || formReasonId === 9) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2"
                    >
                      <label className="block text-xs font-bold text-amber-900">
                        Completar texto del Motivo (Sustituye u completa los puntos suspensivos):
                      </label>
                      <input
                        type="text"
                        placeholder={
                          formReasonId === 7 
                            ? "Ej: Juan Pérez y Esteban Mora en patio de enseñanza media" 
                            : formReasonId === 8 
                              ? "Ej: Maltrato físico por tercero en dependencias externas"
                              : "Ej: Deserción escolar injustificada durante junio"
                        }
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-700"
                        value={formReasonCustomText}
                        onChange={(e) => setFormReasonCustomText(e.target.value)}
                      />
                      <p className="text-[10.5px] text-amber-800">
                        * Este texto reemplaza o se anexa directamente en su reporte final impreso.
                      </p>
                    </motion.div>
                  )}

                  {/* Context Textarea box */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      Contextualización breve de la entrevista * (Brevemente escribir qué sucedió, con quiénes sucedió y dónde sucedió):
                    </label>
                    <textarea
                      placeholder="Redacte aquí una reseña neutral y ejecutiva de los sucesos, describiendo claramente actores involucrados, lugares y horas."
                      rows={5}
                      required
                      className="w-full p-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 leading-relaxed"
                      value={formContextText}
                      onChange={(e) => setFormContextText(e.target.value)}
                    />
                  </div>

                </div>
              )}

              {/* STEP 3: STRUCTURED BACKGROUND DISCOVERY (RELATOS & PREGUNTAS) */}
              {formStep === 3 && (
                <div className="space-y-6">
                  
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase font-mono">
                        Antecedentes de la entrevista
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Si son relatos, registre aquí de forma estructurada las preguntas puntuales formuladas por el entrevistador junto a los comentarios provistos.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddNewQuestion}
                      className="bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs px-3 py-1.5 rounded-lg border border-teal-200 font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Pregunta/Relato
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formBackgroundQuestions.map((qa, index) => (
                      <div key={qa.id} className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                            Pregunta e Intervención #{index + 1}
                          </span>
                          
                          {formBackgroundQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQA(index)}
                              className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                              title="Retirar Question"
                            >
                              <X className="w-3 h-3" /> Quitar
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Pregunta formulada por el Entrevistador:</label>
                            <input
                              type="text"
                              className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770"
                              value={qa.question}
                              onChange={(e) => handleUpdateQA(index, "question", e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Respuesta, Declaración o Declaraciones del Estudiante/Apoderado:</label>
                            <textarea
                              rows={2.5}
                              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770 leading-relaxed"
                              value={qa.answer}
                              placeholder="Mencione citas exactas o detalles sustantivos entregados..."
                              onChange={(e) => handleUpdateQA(index, "answer", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notas Generales Adicionales de Antecedentes (Opcional):
                    </label>
                    <textarea
                      placeholder="Redacte observaciones conductuales del estudiante o apoderado durante la entrevista (ej: llanto, nerviosismo, actitud colaborativa)."
                      rows={3.5}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700"
                      value={formBackgroundGeneralText}
                      onChange={(e) => setFormBackgroundGeneralText(e.target.value)}
                    />
                  </div>

                </div>
              )}

              {/* STEP 4: COMMITMENTS, AGREEMENTS & SUPPORT MEASURES */}
              {formStep === 4 && (
                <div className="space-y-6">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      V. Acuerdos y/o Compromisos Adquiridos *:
                    </label>
                    <p className="text-[11px] text-slate-550 mb-1.5 font-medium">
                      En esta sección escriba qué se compromete a realizar el estudiante, qué realizará el apoderado o tutor, y cuál será el compromiso que asume la institución académica para resolver la situación.
                    </p>
                    <textarea
                      placeholder="Ej: 1. El estudiante Benjamín Rojas se compromete a abstenerse de conductas lúdicas bruscas.\n2. El apoderado asistirá a reuniones escolares cuando sea convocado."
                      rows={5}
                      required
                      className="w-full p-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 leading-relaxed"
                      value={formAgreementsText}
                      onChange={(e) => setFormAgreementsText(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      V. Medidas de Apoyo Pedagógico y/o Psicosocial *:
                    </label>
                    <p className="text-[11px] text-slate-550 mb-1.5 font-medium">
                      Escriba las intervenciones de contención emocional, reforzamiento formativo o tutores designados por los canales de apoyo del colegio.
                    </p>
                    <textarea
                      placeholder="Ej: - Apoyo por parte de la orientadora del colegio con sesiones de tutoría semanales.\n- Acompañamiento en el aula con adaptaciones temporales de ser necesario."
                      rows={5}
                      required
                      className="w-full p-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 leading-relaxed"
                      value={formSupportMeasuresText}
                      onChange={(e) => setFormSupportMeasuresText(e.target.value)}
                    />
                  </div>

                </div>
              )}

              {/* STEP 5: FOLLOW-UP (SEGUIMIENTO Y EVALUACIÓN) */}
              {formStep === 5 && (
                <div className="space-y-6">
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-650">
                    <h3 className="font-bold text-teal-950 mb-1 text-[13px] font-serif">VI. Seguimiento y evaluación de los compromisos adquiridos</h3>
                    <p className="leading-relaxed">
                      De conformidad con el protocolo oficial, en esta sección se detallarán las fechas específicas y los mecanismos de revisión establecidos para asegurar el cumplimiento fiel de lo pactado.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de la Próxima Revisión / Control:</label>
                      <div className="relative">
                        <input
                          type="date"
                          className="w-full p-2.5 pl-9 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770"
                          value={formFollowUpDate}
                          onChange={(e) => setFormFollowUpDate(e.target.value)}
                        />
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Responsable del Seguimiento formativo:</label>
                      <input
                        type="text"
                        placeholder="Ej: Orientadora Escolar / Coordinador de Nivel"
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770"
                        value={formFollowUpResponsible}
                        onChange={(e) => setFormFollowUpResponsible(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mecanismo de Revisión y Control planteado:</label>
                    <textarea
                      placeholder="Redacte aquí cómo constará el cumplimiento de los acuerdos (ej: entrevistas bisemanales cortas, pautas de cotejo de comportamiento entregadas al profesor jefe, etc.)"
                      rows={4.5}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770 leading-relaxed"
                      value={formFollowUpMechanism}
                      onChange={(e) => setFormFollowUpMechanism(e.target.value)}
                    />
                  </div>

                  {/* Confirmation block before saving */}
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 font-mono">CONFIRMACIÓN DE COMPRENSIÓN CLARA</h4>
                      <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                        El informe foliado contendrá el logo oficial del colegio en todos los encabezados exportados de PDF. Verifique que tenga cargado un folio correcto y proceda a archivar el informe.
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Bottom Actions footer bar */}
            <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-wrap justify-between items-center gap-3">
              <div>
                {formStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep - 1)}
                    className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2 px-4 rounded-lg transition"
                    id="btn_paso_anterior"
                  >
                    Anterior Paso
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Seguro que deseas descartar el formulario actual?")) {
                      setCurrentTab("dashboard");
                    }
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold py-2 px-4 rounded-lg transition"
                  id="btn_descartar_fichaje"
                >
                  Descartar
                </button>

                {formStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep + 1)}
                    className="bg-teal-700 hover:bg-teal-850 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition"
                    id="btn_siguiente_paso"
                  >
                    Siguiente Paso <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {/* Normal Save Local */}
                    <button
                      type="button"
                      onClick={() => handleSaveForm(false)}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition"
                      id="btn_archivar_local"
                    >
                      <Check className="w-4 h-4" /> Archivador Local
                    </button>

                    {/* Fast Save y Sync Google Drive */}
                    {driveToken && (
                      <button
                        type="button"
                        onClick={() => handleSaveForm(true)}
                        className="bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                        title="Archiva localmente y sube en tiempo real el duplicado PDF al Google Drive"
                        id="btn_archivar_drive"
                      >
                        <CloudCheck className="w-4 h-4 text-emerald-300 animate-pulse" />
                        Archivar y Enviar a Drive
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* VIEW C: SYSTEM CONFIGURATION & DATABASE EXPORT */}
        {currentTab === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: School Metadata settings */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                    <Sliders className="w-4.5 h-4.5 text-teal-800" />
                    Preferencias Generales del Establecimiento Escolar
                  </h3>
                  <p className="text-xs text-slate-500">Configura los datos del colegio que se estamparán en el encabezado principal del PDF.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Colegio:</label>
                    <input
                      type="text"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770"
                      value={schoolInfo.name}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sub-título / Área directiva:</label>
                    <input
                      type="text"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770"
                      value={schoolInfo.subName}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, subName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dirección del Colegio:</label>
                    <input
                      type="text"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770"
                      value={schoolInfo.address}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">RUT Escolar (Opcional):</label>
                    <input
                      type="text"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-770"
                      value={schoolInfo.rut}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, rut: e.target.value })}
                    />
                  </div>
                </div>

                {/* Save school info button */}
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("cree_school_info", JSON.stringify(schoolInfo));
                    showPrompt("Datos institucionales de CREE actualizados.", "success");
                  }}
                  className="bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold py-1.5 px-3 rounded transition"
                  id="btn_guardar_metadata_colegio"
                >
                  Guardar Datos del Colegio
                </button>
              </div>

              {/* Folio Sequence configs */}
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                    <Layers className="w-4.5 h-4.5 text-teal-800" />
                    Secuencia Automática de Folios
                  </h3>
                  <p className="text-xs text-slate-500">Configura la regla del generador automático de folios del establecimiento.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prefijo de Folio común:</label>
                    <input
                      type="text"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700 font-mono"
                      value={folioPrefix}
                      onChange={(e) => {
                        setFolioPrefix(e.target.value);
                        localStorage.setItem("cree_folio_prefix", e.target.value);
                      }}
                      placeholder="CREE-2026-"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Secuencia siguiente número (#):</label>
                    <input
                      type="number"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700 font-mono"
                      value={nextFolioSeq}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setNextFolioSeq(val);
                        localStorage.setItem("cree_folio_seq", String(val));
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg text-slate-500 text-[11px] leading-relaxed">
                  <strong>Efecto inmediato:</strong> El siguiente reporte generado tendrá el folio sugerido: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold font-mono text-teal-900">{folioPrefix}{String(nextFolioSeq).padStart(3, "0")}</code>. De todas formas, recuerda que en el formulario dispones de una casilla específica para modificar manualmente el folio de cada reporte de forma independiente.
                </div>
              </div>

            </div>

            {/* Right side: Google Drive Sync & local backups */}
            <div className="space-y-6">
              
              {/* Google Drive credentials binding panel */}
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                    <CloudUpload className="w-4.5 h-4.5 text-emerald-700" />
                    Google Drive Cloud Config
                  </h3>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <p className="text-slate-500">
                    Sincroniza tus registros directamente con tu nube en Google Drive utilizando tu propio Client ID desde Google Cloud console con permisos <code className="bg-slate-105 p-0.5 rounded select-all">drive.file</code>.
                  </p>

                  <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 text-[11px] text-teal-900">
                    <h4 className="font-bold mb-1">¿Cómo configurar Google Drive en 2 pasos?</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Ve a la consola de Google Developer y crea un Proyecto.</li>
                      <li>Crea una credencial **ID de cliente OAuth** de tipo *Aplicación Web* y agrega <code className="bg-teal-100/60 p-0.5 select-all rounded">{window.location.origin}</code> como Origen de JavaScript autorizado y URI de redireccionamiento.</li>
                      <li>Copia el **ID de cliente** generado, pégalo abajo y haz clic en *Autorizar*.</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1">Google OAuth Client ID:</label>
                    <textarea
                      rows={2.5}
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-teal-700 font-mono text-[10.5px]"
                      value={driveClientId}
                      onChange={(e) => {
                        setDriveClientId(e.target.value.trim());
                        localStorage.setItem("cree_drive_client_id", e.target.value.trim());
                      }}
                      placeholder="Ej: 123456789-abc.apps.googleusercontent.com"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDriveConnect}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded transition flex items-center justify-center gap-1"
                      id="btn_conectar_api_drive"
                    >
                      <CloudCheck className="w-3.5 h-3.5" />
                      Autorizar Drive
                    </button>
                    {driveToken && (
                      <button
                        onClick={handleDriveDisconnect}
                        className="bg-slate-200 hover:bg-slate-350 text-slate-700 text-xs py-2 px-3 rounded font-semibold transition"
                      >
                        Salir
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Local database Backups (JSON format) */}
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-1.5">
                    <HelpCircle className="w-4.5 h-4.5 text-slate-600" />
                    Respaldos del Sistema Físico
                  </h3>
                  <p className="text-xs text-slate-500">Descarga un respaldo local completo de todas las citaciones en un archivo para archivarlo o transportarlo.</p>
                </div>

                <div className="space-y-3.5">
                  <button
                    onClick={handleExportDatabase}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-xs"
                    id="btn_respaldar_json"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Respaldar Toda la Base Escolar
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleImportDatabase}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
                      id="btn_cargar_respaldo"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Extraer / Cargar Respaldo JSON
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                    Sugerido: Realiza esta exportación del registro de entrevistas al cierre de cada semestre escolar para resguardo.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* 4. FOOTER CREDITS */}
      <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-[10.5px] text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 Colegio CREE Cerro Navia – Dirección y Convivencia Escolar.</p>
          <p className="flex items-center gap-1">
            <span>Soportado por</span>
            <span className="font-mono bg-slate-200 px-1 py-0.5 rounded font-bold text-teal-900">Google Drive API</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
