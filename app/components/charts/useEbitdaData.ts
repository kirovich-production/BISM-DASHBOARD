import { useMemo } from 'react';
import type { ExcelRow } from '@/types';
import type { SalesVsEbitdaDataPoint } from './SalesVsEbitdaChart';
import type { EbitdaDataPoint } from './EbitdaLineChart';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const parseMoneyString = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export function useEbitdaData(sections: { name: string; data: ExcelRow[] }[]) {
  return useMemo(() => {
    console.log('\n=== USE EBITDA DATA HOOK ===');
    const consolidadosSection = sections.find(s => s.name === 'Consolidados');
    const labranzaSection = sections.find(s => s.name === 'Labranza');
    const sevillaSection = sections.find(s => s.name === 'Sevilla');

    if (!consolidadosSection) {
      console.log('❌ No se encontró sección Consolidados');
      return {
        salesVsEbitda: [],
        ebitdaMonthly: [],
        hasData: false,
      };
    }

    console.log('✅ Sección Consolidados encontrada con', consolidadosSection.data.length, 'filas');

    // Buscar filas de Ventas Netas y EBITDA
    const ventasNetasRow = consolidadosSection.data.find(row => {
      const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
      return item.includes('venta') && item.includes('neta');
    });

    console.log('Buscar EBITDA - Buscando row con item === "ebitda" o "ebidta"');
    const ebitdaRow = consolidadosSection.data.find(row => {
      const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
      const match = item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
      if (match) {
        console.log('✅ ENCONTRADO EBITDA/EBIDTA:', item, 'Original:', row['Item']);
      }
      return match;
    });

    if (!ebitdaRow) {
      console.log('❌ NO SE ENCONTRÓ fila EBITDA en Consolidados');
      console.log('Items disponibles:', consolidadosSection.data.map(r => r['Item']));
    }

    if (!ventasNetasRow) {
      console.log('❌ NO SE ENCONTRÓ fila Ventas Netas');
    } else {
      console.log('✅ Ventas Netas encontrada');
    }

    const ebitdaLabranzaRow = labranzaSection?.data.find(row => {
      const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
      return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
    });

    const ebitdaSevillaRow = sevillaSection?.data.find(row => {
      const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
      return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
    });

    console.log('EBITDA Labranza:', ebitdaLabranzaRow ? '✅' : '❌');
    console.log('EBITDA Sevilla:', ebitdaSevillaRow ? '✅' : '❌');

    const salesVsEbitda: SalesVsEbitdaDataPoint[] = [];
    const ebitdaMonthly: EbitdaDataPoint[] = [];

    // Procesar datos mensuales
    MONTHS.forEach(month => {
      const salesValue = ventasNetasRow?.[`${month} Monto`];
      const ebitdaValue = ebitdaRow?.[`${month} Monto`];
      const ebitdaLabranzaValue = ebitdaLabranzaRow?.[`${month} Monto`];
      const ebitdaSevillaValue = ebitdaSevillaRow?.[`${month} Monto`];

      const sales = parseMoneyString(salesValue);
      const ebitda = parseMoneyString(ebitdaValue);
      const ebitdaLabranza = parseMoneyString(ebitdaLabranzaValue);
      const ebitdaSevilla = parseMoneyString(ebitdaSevillaValue);

      // Solo incluir meses con datos
      if (sales > 0 || ebitda > 0) {
        salesVsEbitda.push({
          month: month.substring(0, 3), // Abreviado
          sales,
          ebitda,
        });

        ebitdaMonthly.push({
          month: month.substring(0, 3),
          labranza: ebitdaLabranza,
          sevilla: ebitdaSevilla,
          total: ebitda,
        });
      }
    });

    return {
      salesVsEbitda,
      ebitdaMonthly,
      hasData: salesVsEbitda.length > 0,
    };
  }, [sections]);
}
