import { ExcelRow } from '@/types';
import { convertEERRToExcelRows } from '@/lib/formatters';

/**
 * Re-exportar la función centralizada para mantener compatibilidad
 * @deprecated Usar directamente `convertEERRToExcelRows` de '@/lib/formatters'
 */
export const convertEERRDataToExcelRows = convertEERRToExcelRows;

/**
 * Suma dos tablas ExcelRow[] (Labranza + Sevilla = Consolidados)
 */
export function sumarTablas(labranza: ExcelRow[], sevilla: ExcelRow[]): ExcelRow[] {
  const consolidado: ExcelRow[] = [];
  
  // Crear mapa de items de Labranza
  const labranzaMap = new Map<string, ExcelRow>();
  labranza.forEach(row => {
    labranzaMap.set(row.Item, row);
  });
  
  // Crear mapa de items de Sevilla
  const sevillaMap = new Map<string, ExcelRow>();
  sevilla.forEach(row => {
    sevillaMap.set(row.Item, row);
  });
  
  // Obtener todos los items únicos (unión de ambas tablas)
  const allItems = new Set([
    ...Array.from(labranzaMap.keys()),
    ...Array.from(sevillaMap.keys())
  ]);
  
  // Sumar cada item
  allItems.forEach(item => {
    const rowLabranza = labranzaMap.get(item);
    const rowSevilla = sevillaMap.get(item);
    
    const consolidadoRow: ExcelRow = { Item: item };
    
    // Obtener todas las columnas (excepto Item)
    const columns = new Set<string>();
    if (rowLabranza) {
      Object.keys(rowLabranza).forEach(key => {
        if (key !== 'Item') columns.add(key);
      });
    }
    if (rowSevilla) {
      Object.keys(rowSevilla).forEach(key => {
        if (key !== 'Item') columns.add(key);
      });
    }
    
    // Sumar valores de cada columna
    columns.forEach(column => {
      const valLabranza = rowLabranza?.[column];
      const valSevilla = rowSevilla?.[column];
      
      // Si es columna de %, promediar (no sumar)
      if (column.includes('%')) {
        const numLabranza = typeof valLabranza === 'number' ? valLabranza : 0;
        const numSevilla = typeof valSevilla === 'number' ? valSevilla : 0;
        
        // Si solo hay un valor, usar ese. Si hay dos, promediar
        if (numLabranza > 0 && numSevilla > 0) {
          consolidadoRow[column] = (numLabranza + numSevilla) / 2;
        } else if (numLabranza > 0) {
          consolidadoRow[column] = numLabranza;
        } else if (numSevilla > 0) {
          consolidadoRow[column] = numSevilla;
        } else {
          consolidadoRow[column] = 0;
        }
      } else {
        // Para Monto y Promedio, sumar
        const numLabranza = typeof valLabranza === 'number' ? valLabranza : 0;
        const numSevilla = typeof valSevilla === 'number' ? valSevilla : 0;
        consolidadoRow[column] = numLabranza + numSevilla;
      }
    });
    
    consolidado.push(consolidadoRow);
  });
  
  return consolidado;
}
