// Tipos para los datos del Excel
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
  uploadedAt: Date;
  sections: ExcelSection[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  recordsInserted: number;
  fileName: string;
  sheetName: string;
  sectionsFound: string[];
}

export interface DataResponse {
  success: boolean;
  data: UploadedDocument | null;
  uploadedAt?: Date;
}
