'use client';

import { useRef } from 'react';
import GraphSidebar from './GraphSidebar';
import ChartContainer from './charts/ChartContainer';
import SalesAccumulatedChart, { type ChartRef } from './charts/SalesAccumulatedChart';
import SalesDistributionChart from './charts/SalesDistributionChart';
import { useChartData } from './charts/useChartData';
import type { ExcelRow } from '@/types';

interface GraphViewProps {
  selectedPeriod: string | null;
  onPeriodChange: (period: string) => void;
  availablePeriods: string[];
  sections: { name: string; data: ExcelRow[] }[];
}

export default function GraphView({
  selectedPeriod,
  onPeriodChange,
  availablePeriods,
  sections,
}: GraphViewProps) {
  const chartRef = useRef<ChartRef>(null);
  const distributionChartRef = useRef<ChartRef>(null);
  const chartData = useChartData(sections);

  console.log('GraphView render:', { selectedPeriod, availablePeriods, sections, chartData });

  const handleExport = () => {
    chartRef.current?.exportToPNG();
  };

  const handleDistributionExport = () => {
    distributionChartRef.current?.exportToPNG();
  };

  // Calcular totales para el gráfico circular
  const parseMoneyString = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const labranzaSection = sections.find(s => s.name === 'Labranza');
  const sevillaSection = sections.find(s => s.name === 'Sevilla');

  const labranzaTotal = labranzaSection
    ? parseMoneyString(
        labranzaSection.data.find(row => 
          String(row['Item'] || '').toLowerCase().trim().includes('venta') && 
          String(row['Item'] || '').toLowerCase().trim().includes('neta')
        )?.['ANUAL Monto']
      )
    : 0;

  const sevillaTotal = sevillaSection
    ? parseMoneyString(
        sevillaSection.data.find(row => 
          String(row['Item'] || '').toLowerCase().trim().includes('venta') && 
          String(row['Item'] || '').toLowerCase().trim().includes('neta')
        )?.['ANUAL Monto']
      )
    : 0;

  return (
    <div className="flex h-full bg-gray-50">
      <GraphSidebar
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        availablePeriods={availablePeriods}
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6 xl:p-8">
        {!selectedPeriod ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecciona un período
              </h3>
              <p className="text-sm text-gray-500">
                Elige un período del sidebar para visualizar los gráficos
              </p>
            </div>
          </div>
        ) : sections.length === 0 ? (
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
                No hay datos disponibles
              </h3>
              <p className="text-sm text-gray-500">
                No se encontraron datos para el período seleccionado
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Grid de gráficos lado a lado (50/50) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 2xl:gap-8">
              {/* Gráfico de Ventas Acumuladas */}
              <ChartContainer
                title="Ventas Netas Acumuladas"
                onExport={handleExport}
              >
                <SalesAccumulatedChart ref={chartRef} data={chartData} />
              </ChartContainer>

              {/* Gráfico de Distribución - más grande */}
              <ChartContainer
                title="Distribución de Ventas"
                onExport={handleDistributionExport}
                className="h-full min-h-[600px] md:min-h-[700px] lg:min-h-[750px]"
              >
                <SalesDistributionChart 
                  ref={distributionChartRef}
                  labranzaTotal={labranzaTotal}
                  sevillaTotal={sevillaTotal}
                />
              </ChartContainer>
            </div>

            {/* Resumen de datos */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                Resumen del Período
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {sections.map((section) => {
                  const ventasNetasRow = section.data.find(row => {
                    const item = String(row['Item'] || '').toLowerCase().trim();
                    return item.includes('venta') && item.includes('neta');
                  });
                  const anualMonto = ventasNetasRow?.['ANUAL Monto'] || 0;

                  return (
                    <div
                      key={section.name}
                      className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200"
                    >
                      <h4 className="text-xs md:text-sm font-medium text-gray-600 mb-1 md:mb-2">
                        {section.name}
                      </h4>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(parseMoneyString(anualMonto))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total acumulado
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
