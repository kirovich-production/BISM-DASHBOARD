'use client';

import { useRef } from 'react';
import ChartContainer from './charts/ChartContainer';
import SalesVsEbitdaChart from './charts/SalesVsEbitdaChart';
import EbitdaLineChart from './charts/EbitdaLineChart';
import EbitdaComparisonChart from './charts/EbitdaComparisonChart';
import { useEbitdaData } from './charts/useEbitdaData';
import type { ChartRef } from './charts/SalesAccumulatedChart';
import type { ExcelRow } from '@/types';

interface EbitdaDashboardProps {
  sections: { name: string; data: ExcelRow[] }[];
}

const parseMoneyString = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export default function EbitdaDashboard({ sections }: EbitdaDashboardProps) {
  const salesVsEbitdaRef = useRef<ChartRef>(null);
  const ebitdaLineRef = useRef<ChartRef>(null);
  const ebitdaComparisonRef = useRef<ChartRef>(null);
  
  // DEBUG: Ver qué datos tenemos
  console.log('=== EBITDA DASHBOARD DEBUG ===');
  console.log('Sections:', sections.map(s => s.name));
  
  const { salesVsEbitda, ebitdaMonthly, hasData } = useEbitdaData(sections);

  // Calcular métricas para las cards superiores
  const consolidadosSection = sections.find(s => s.name === 'Consolidados');
  const labranzaSection = sections.find(s => s.name === 'Labranza');
  const sevillaSection = sections.find(s => s.name === 'Sevilla');
  
  if (consolidadosSection) {
    console.log('\n=== ITEMS EN CONSOLIDADOS ===');
    consolidadosSection.data.forEach((row, idx) => {
      console.log(`${idx + 1}. "${row['Item']}" (lowercase: "${String(row['Item'] || '').toLowerCase().trim()}")`);
    });
    console.log('============================\n');
  } else {
    console.log('⚠️ No se encontró la sección Consolidados');
  }
  
  if (labranzaSection) {
    console.log('\n=== ITEMS EN LABRANZA ===');
    labranzaSection.data.forEach((row, idx) => {
      console.log(`${idx + 1}. "${row['Item']}"`);
    });
  }
  
  if (sevillaSection) {
    console.log('\n=== ITEMS EN SEVILLA ===');
    sevillaSection.data.forEach((row, idx) => {
      console.log(`${idx + 1}. "${row['Item']}"`);
    });
  }

  const ebitdaConsolidadoRow = consolidadosSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    console.log('Buscando EBITDA, comparando:', item, '=== "ebitda" o "ebidta"?', item === 'ebitda' || item === 'ebidta');
    return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
  });

  const ventasNetasRow = consolidadosSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    return item.includes('venta') && item.includes('neta');
  });

  const ebitdaLabranzaRow = labranzaSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
  });

  const ebitdaSevillaRow = sevillaSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
  });

  const ebitdaTotal = parseMoneyString(ebitdaConsolidadoRow?.['ANUAL Monto']);
  const ventasTotal = parseMoneyString(ventasNetasRow?.['ANUAL Monto']);
  const margenEbitda = ventasTotal > 0 ? ((ebitdaTotal / ventasTotal) * 100) : 0;
  
  const ebitdaLabranza = parseMoneyString(ebitdaLabranzaRow?.['ANUAL Monto']);
  const ebitdaSevilla = parseMoneyString(ebitdaSevillaRow?.['ANUAL Monto']);

  const handleSalesVsEbitdaExport = () => {
    salesVsEbitdaRef.current?.exportToPNG();
  };

  const handleEbitdaLineExport = () => {
    ebitdaLineRef.current?.exportToPNG();
  };

  const handleEbitdaComparisonExport = () => {
    ebitdaComparisonRef.current?.exportToPNG();
  };

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-yellow-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay datos de EBITDA disponibles
          </h3>
          <p className="text-sm text-gray-500">
            Los datos cargados no contienen información de EBITDA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">EBITDA Total</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-3xl font-bold">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              notation: 'compact',
              compactDisplay: 'short',
            }).format(ebitdaTotal)}
          </p>
          <p className="text-sm mt-2 opacity-80">Acumulado anual</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Margen EBITDA</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{margenEbitda.toFixed(1)}%</p>
          <p className="text-sm mt-2 opacity-80">EBITDA / Ventas Netas</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Mejor Unidad</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <p className="text-2xl font-bold">
            {ebitdaLabranza > ebitdaSevilla ? 'Labranza' : 'Sevilla'}
          </p>
          <p className="text-sm mt-2 opacity-80">
            {new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              notation: 'compact',
              compactDisplay: 'short',
            }).format(Math.max(ebitdaLabranza, ebitdaSevilla))}
          </p>
        </div>
      </div>

      {/* Gráfico principal: Ventas vs EBITDA */}
      <ChartContainer
        title="Análisis de Ventas vs EBITDA"
        onExport={handleSalesVsEbitdaExport}
      >
        <SalesVsEbitdaChart ref={salesVsEbitdaRef} data={salesVsEbitda} />
      </ChartContainer>

      {/* Gráficos secundarios lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <ChartContainer
          title="Evolución EBITDA Mensual"
          onExport={handleEbitdaLineExport}
        >
          <EbitdaLineChart ref={ebitdaLineRef} data={ebitdaMonthly} />
        </ChartContainer>

        <ChartContainer
          title="Comparación por Unidad"
          onExport={handleEbitdaComparisonExport}
        >
          <EbitdaComparisonChart 
            ref={ebitdaComparisonRef}
            labranzaTotal={ebitdaLabranza}
            sevillaTotal={ebitdaSevilla}
            consolidadoTotal={ebitdaTotal}
          />
        </ChartContainer>
      </div>

      {/* Tabla resumen mensual */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
          Resumen Mensual EBITDA
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Labranza
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sevilla
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variación
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ebitdaMonthly.map((item, index) => {
                const prevTotal = index > 0 ? ebitdaMonthly[index - 1].total : item.total;
                const variation = prevTotal > 0 ? ((item.total - prevTotal) / prevTotal * 100) : 0;
                
                return (
                  <tr key={item.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.month}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(item.labranza)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(item.sevilla)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(item.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {index === 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <span className={`font-semibold ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
