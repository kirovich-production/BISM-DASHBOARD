// Usuario del sistema
export interface User {
  id: string;
  name: string;
  createdAt: Date;
}

// Sesión de usuario (DB Sessions)
export interface UserSession {
  sessionId: string;      // UUID único para la sesión
  userId: string;         // ID del usuario
  userName: string;       // Nombre del usuario (desnormalizado para performance)
  createdAt: Date;        // Fecha de creación de la sesión
  expiresAt: Date;        // Fecha de expiración (7 días por defecto)
  lastActivityAt: Date;   // Última actividad (para renovar sesión)
  userAgent?: string;     // Info del navegador (opcional, para seguridad)
  ipAddress?: string;     // IP del usuario (opcional, para seguridad)
}

export interface SessionResponse {
  success: boolean;
  sessionId?: string;
  userId?: string;
  userName?: string;
  error?: string;
}

// Datos EERR (Estado de Resultados) - Nuevo formato
export interface EERRRow {
  Item: string;
  [key: string]: string | number | undefined;  // "Enero Monto", "Enero %", etc.
}

export interface EERRCategory {
  name: string;
  rows: EERRRow[];
  total?: EERRRow;
}

export interface EERRData {
  sheetName: string;
  months: string[];
  categories: EERRCategory[];
  rawData?: unknown[];
}

// Tipos para los datos del Excel formato antiguo (Consolidado)
export interface ExcelRow {
  Item: string;
  'Enero Monto'?: number;
  'Enero %'?: number;
  'Febrero Monto'?: number;
  'Febrero %'?: number;
  'Marzo Monto'?: number;
  'Marzo %'?: number;
  'Abril Monto'?: number;
  'Abril %'?: number;
  'Mayo Monto'?: number;
  'Mayo %'?: number;
  'Junio Monto'?: number;
  'Junio %'?: number;
  'Julio Monto'?: number;
  'Julio %'?: number;
  'Agosto Monto'?: number;
  'Agosto %'?: number;
  'Septiembre Monto'?: number;
  'Septiembre %'?: number;
  'Octubre Monto'?: number;
  'Octubre %'?: number;
  'Noviembre Monto'?: number;
  'Noviembre %'?: number;
  'Diciembre Monto'?: number;
  'Diciembre %'?: number;
  'ANUAL Monto'?: number;
  'ANUAL %'?: number;
  'ANUAL Promedio'?: number;
  [key: string]: string | number | undefined;
}

export interface ExcelSection {
  name: string; // Cualquier nombre de sección (Sevilla, Labranza, Consolidados, Santiago, etc.)
  data: ExcelRow[];
}

export interface UploadedDocument {
  _id?: string;
  userId: string;  // ID del usuario propietario
  fileName: string;
  sheetName: string;
  period: string;  // Formato: YYYY-MM (Ej: "2025-01")
  periodLabel: string;  // Formato: "Mes Año" (Ej: "Enero 2025")
  version: number;  // 1, 2, 3... (autoincremental por período y usuario)
  uploadedAt: Date;
  
  // NUEVAS ESTRUCTURAS:
  consolidado?: ExcelSection[];  // Formato antiguo (3 secciones: Labranza, Sevilla, Consolidados)
  sevilla?: EERRData;            // Nuevo formato EERR Sevilla
  labranza?: EERRData;           // Nuevo formato EERR Labranza
  
  // DEPRECATED (mantener compatibilidad temporal):
  sections?: ExcelSection[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  recordsInserted: number;
  fileName: string;
  sheetName: string;
  period: string;
  periodLabel: string;
  version: number;
  sectionsFound: string[];
}

export interface DataResponse {
  success: boolean;
  data: UploadedDocument | null;
  uploadedAt?: Date;
}

export interface Period {
  _id?: string;
  userId: string;  // ID del usuario propietario
  period: string;
  periodLabel: string;
  fileName: string;
  version: number;
  uploadedAt: Date;
  versionCount?: number; // Total de versiones para este período
}

export interface PeriodsResponse {
  success: boolean;
  periods: Period[];
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface YearsRangeResponse {
  success: boolean;
  minYear: number;
  maxYear: number;
  years: number[];
}
