import { useMemo } from 'react';
import type { ExcelRow } from '@/types';

export interface ChartDataPoint {
  month: string;
  consolidado: number;
  labranza: number;
  sevilla: number;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Función helper para convertir strings de moneda a números
function parseMoneyString(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  
  // Remover $, comas, espacios y convertir a número
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function useChartData(sections: { name: string; data: ExcelRow[] }[]) {
  return useMemo(() => {
    console.log('useChartData - sections received:', sections);
    
    const chartData: ChartDataPoint[] = [];

    // Imprimir primera fila de cada sección para debugging
    sections.forEach(section => {
      if (section.data.length > 0) {
        console.log(`Primera fila de ${section.name}:`, section.data[0]);
      }
    });

    // Encontrar las filas de "Ventas Netas" en cada sección
    // Usar búsqueda flexible (case-insensitive, trim espacios)
    // NOTA: El campo se llama 'Item' no 'Detalle'
    const consolidadoData = sections
      .find(s => s.name === 'Consolidados')
      ?.data.find(row => {
        const item = String(row['Item'] || '').toLowerCase().trim();
        return item.includes('venta') && item.includes('neta');
      });

    const labranzaData = sections
      .find(s => s.name === 'Labranza')
      ?.data.find(row => {
        const item = String(row['Item'] || '').toLowerCase().trim();
        return item.includes('venta') && item.includes('neta');
      });

    const sevillaData = sections
      .find(s => s.name === 'Sevilla')
      ?.data.find(row => {
        const item = String(row['Item'] || '').toLowerCase().trim();
        return item.includes('venta') && item.includes('neta');
      });

    console.log('useChartData - found rows:', { consolidadoData, labranzaData, sevillaData });

    // Construir el array de datos mensuales
    // Solo agregar meses que tienen datos (al menos una sección con valor > 0)
    MONTHS.forEach(month => {
      const monthKey = `${month} Monto` as keyof ExcelRow;
      
      const consolidado = parseMoneyString(consolidadoData?.[monthKey]);
      const labranza = parseMoneyString(labranzaData?.[monthKey]);
      const sevilla = parseMoneyString(sevillaData?.[monthKey]);
      
      // Solo agregar si al menos una sección tiene datos
      if (consolidado > 0 || labranza > 0 || sevilla > 0) {
        chartData.push({
          month,
          consolidado,
          labranza,
          sevilla,
        });
      }
    });

    console.log('useChartData - final chartData:', chartData);
    return chartData;
  }, [sections]);
}
