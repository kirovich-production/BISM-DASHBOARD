// Tipos para los datos del Excel y las respuestas de la API
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
  name: 'Labranza' | 'Sevilla' | 'Consolidados';
  data: ExcelRow[];
}

export interface UploadedDocument {
  _id?: string;
  fileName: string;
  sheetName: string;
  period: string;  // Formato: YYYY-MM (Ej: "2025-01")
  periodLabel: string;  // Formato: "Mes Año" (Ej: "Enero 2025")
  version: number;  // 1, 2, 3... (autoincremental por período)
  uploadedAt: Date;
  sections: ExcelSection[];
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
