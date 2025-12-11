/**
 * Constantes centralizadas para la aplicación
 * Evita valores hardcodeados dispersos en el código
 */

// ============================================
// NOMBRES DE COLECCIONES MONGODB
// ============================================
export const COLLECTIONS = {
  LIBRO_COMPRAS: 'libroCompras',
  PROVEEDORES_MAESTRO: 'proveedoresMaestro',
  PROVEEDORES: 'proveedores',
  VALORES_MANUALES: 'valoresManuales',
  USERS: 'users',
  SESSIONS: 'sessions',
} as const;

// ============================================
// CONFIGURACIÓN DE SESIONES
// ============================================
export const SESSION_CONFIG = {
  DURATION_DAYS: 7,
  COOKIE_NAME: 'bism_session_id',
} as const;

// ============================================
// NOMBRES DE MESES (para uso en EERR y gráficos)
// ============================================
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

export const MONTH_SHORT_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
] as const;

// ============================================
// RESPUESTAS DE API ESTANDARIZADAS
// ============================================
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Crea una respuesta de éxito estandarizada
 */
export function createSuccessResponse<T>(data?: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  };
}

/**
 * Crea una respuesta de error estandarizada
 */
export function createErrorResponse(error: string, details?: string): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(details && { details }),
  };
}

// ============================================
// CONFIGURACIÓN DE PAGINACIÓN
// ============================================
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
} as const;

// ============================================
// VALIDACIONES
// ============================================
export const VALID_EXCEL_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

/**
 * Verifica si un tipo MIME es un archivo Excel válido
 */
export function isValidExcelType(mimeType: string): boolean {
  return VALID_EXCEL_TYPES.includes(mimeType as typeof VALID_EXCEL_TYPES[number]);
}
