/**
 * Funciones centralizadas de formateo y conversión de datos
 * Elimina duplicación de código en componentes
 */

import type { ExcelRow, EERRData } from '@/types';

/**
 * Formatea un número con separadores de miles (formato chileno)
 * @param value - Número a formatear
 * @returns String formateado o '-' si el valor es inválido
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  
  const strValue = String(value);
  
  // Si contiene #DIV/0! u otro error, retornar como está
  if (strValue.includes('#') || strValue.includes('DIV')) return strValue;
  
  const num = typeof value === 'number' ? value : parseFloat(strValue.replace(/,/g, ''));
  if (isNaN(num)) return strValue;
  
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Formatea un número como moneda CLP
 * @param value - Número a formatear
 * @returns String formateado como moneda o '-' si el valor es inválido
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Formatea un número como porcentaje
 * @param value - Número a formatear (ej: 25 para 25%)
 * @param decimalPlaces - Cantidad de decimales (default: 2)
 * @returns String formateado como porcentaje
 */
export function formatPercentage(value: number | string | null | undefined, decimalPlaces: number = 2): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('es-CL', {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(num / 100);
}

/**
 * Formatea un valor genérico (número o porcentaje)
 * @param value - Valor a formatear
 * @param isPercentage - Si es porcentaje
 * @returns String formateado
 */
export function formatValue(value: unknown, isPercentage: boolean = false): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    if (isPercentage) {
      return formatPercentage(value);
    }
    return formatNumber(value);
  }
  return String(value);
}

/**
 * Parsea valores monetarios o numéricos de diferentes formatos
 * Maneja: "$1,234,567", "1.234.567", "$0", "#DIV/0!", etc.
 * @param value - Valor a parsear
 * @returns Número parseado o 0 si es inválido
 */
export function parseValue(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Manejar casos especiales
    if (value === '#DIV/0!' || value === '' || value === '$0') return 0;
    
    // Limpiar: remover $, espacios
    let cleaned = value.replace(/[$\s]/g, '');
    
    // Si hay comas, asumir que son separadores de miles (formato: 2,365,037)
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/,/g, '');
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Convierte datos en formato EERRData a un array plano de ExcelRow
 * Útil para componentes que esperan ExcelRow[] en lugar de EERRData
 * @param eerrData - Datos en formato EERR estructurado
 * @returns Array plano de filas Excel
 */
export function convertEERRToExcelRows(eerrData: EERRData | null | undefined): ExcelRow[] {
  if (!eerrData || !eerrData.categories) return [];
  
  const rows: ExcelRow[] = [];
  
  eerrData.categories.forEach((category) => {
    // Agregar filas de la categoría
    if (category.rows) {
      category.rows.forEach((row) => {
        rows.push(row);
      });
    }
    
    // Agregar fila de total si existe
    if (category.total) {
      rows.push(category.total);
    }
  });
  
  return rows;
}
