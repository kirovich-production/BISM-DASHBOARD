'use client';

import { useState, useMemo, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import type { ExcelRow } from '@/types';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface TrimestralAnalysisViewProps {
  data: ExcelRow[];
  periodLabel: string;
}

// Definición de trimestres
const QUARTERS = {
  Q1: { label: 'Q1 (Ene-Mar)', shortLabel: 'Q1', months: ['Enero', 'Febrero', 'Marzo'] },
  Q2: { label: 'Q2 (Abr-Jun)', shortLabel: 'Q2', months: ['Abril', 'Mayo', 'Junio'] },
  Q3: { label: 'Q3 (Jul-Sep)', shortLabel: 'Q3', months: ['Julio', 'Agosto', 'Septiembre'] },
  Q4: { label: 'Q4 (Oct-Dic)', shortLabel: 'Q4', months: ['Octubre', 'Noviembre', 'Diciembre'] }
} as const;

type QuarterKey = keyof typeof QUARTERS;



// Función para parsear valores monetarios
const parseValue = (value: string | number | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value === '#DIV/0!' || value === '' || value === '$0') return 0;
    let cleaned = value.replace(/\$|\s/g, '');
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/,/g, '');
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export default function TrimestralAnalysisView({ data, periodLabel }: TrimestralAnalysisViewProps) {
  const [selectedQuarter1, setSelectedQuarter1] = useState<QuarterKey>('Q1');
  const [selectedQuarter2, setSelectedQuarter2] = useState<QuarterKey>('Q3');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState<'comparison' | 'evolution'>('comparison');
  const [notes, setNotes] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Extraer ítems disponibles
  const availableItems = useMemo(() => {
    return data
      .map(row => row.Item)
      .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      .slice(0, 20); // Limitar para performance
  }, [data]);

  // Función para calcular métricas trimestrales
  const calculateQuarterMetrics = useMemo(() => (quarterKey: QuarterKey, item: string) => {
    const quarter = QUARTERS[quarterKey];
    const itemRow = data.find(row => row.Item === item);
    
    if (!itemRow) return { total: 0, average: 0, peak: 0, peakMonth: '', values: [0, 0, 0] };

    const values = quarter.months.map(month => {
      const value = parseValue(itemRow[`${month} Monto`]);
      return value;
    });

    const total = values.reduce((acc, val) => acc + val, 0);
    const average = total / 3;
    const peak = Math.max(...values);
    const peakIndex = values.indexOf(peak);
    const peakMonth = quarter.months[peakIndex];

    return { total, average, peak, peakMonth, values };
  }, [data]);

  // Datos para gráfico de comparación trimestral
  const comparisonChartData = useMemo(() => {
    // Labels serán los nombres de los ítems seleccionados
    const labels = selectedItems;
    
    // Crear dos datasets: uno para cada trimestre
    const q1Data = selectedItems.map(item => {
      const metrics = calculateQuarterMetrics(selectedQuarter1, item);
      return metrics.total;
    });

    const q2Data = selectedItems.map(item => {
      const metrics = calculateQuarterMetrics(selectedQuarter2, item);
      return metrics.total;
    });

    const datasets = [
      {
        label: QUARTERS[selectedQuarter1].label,
        data: q1Data,
        backgroundColor: '#3b82f6', // Azul para Q1
        borderColor: '#3b82f6',
        borderWidth: 2,
      },
      {
        label: QUARTERS[selectedQuarter2].label,
        data: q2Data,
        backgroundColor: '#f59e0b', // Naranja para Q2
        borderColor: '#f59e0b',
        borderWidth: 2,
      }
    ];

    return {
      labels,
      datasets
    };
  }, [selectedQuarter1, selectedQuarter2, selectedItems, calculateQuarterMetrics]);  // Datos para gráfico de evolución mensual
  const evolutionChartData = useMemo(() => {
    if (selectedItems.length === 0) return { labels: [], datasets: [] };

    const allMonths = [
      ...QUARTERS[selectedQuarter1].months,
      ...QUARTERS[selectedQuarter2].months
    ];

    const datasets = selectedItems.map((item, index) => {
      const itemRow = data.find(row => row.Item === item);
      if (!itemRow) return null;

      const values = allMonths.map(month => parseValue(itemRow[`${month} Monto`]));
      
      const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
      ];

      return {
        label: item,
        data: values,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 3,
        fill: false,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
      };
    }).filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== null);

    return {
      labels: allMonths.map(month => month.substring(0, 3)), // Abreviar nombres
      datasets
    };
  }, [selectedQuarter1, selectedQuarter2, selectedItems, data]);

  // Opciones del gráfico de comparación
  const comparisonOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: `Comparación Trimestral: ${QUARTERS[selectedQuarter1].label} vs ${QUARTERS[selectedQuarter2].label}`,
        font: { size: 18, weight: 'bold' },
        color: '#1f2937',
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: ${new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            weight: 'bold'
          }
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Trimestral (CLP)',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: '#374151',
          callback: function(value) {
            return new Intl.NumberFormat('es-CL', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value as number);
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    }
  };

  // Opciones del gráfico de evolución
  const evolutionOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        }
      },
      title: {
        display: true,
        text: `Evolución Mensual: ${QUARTERS[selectedQuarter1].label} + ${QUARTERS[selectedQuarter2].label}`,
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: ${new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('es-CL', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value as number);
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    }
  };

  // Función para toggle de ítems
  const toggleItem = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  // Calcular métricas comparativas
  const getComparativeMetrics = () => {
    return selectedItems.map(item => {
      const q1Metrics = calculateQuarterMetrics(selectedQuarter1, item);
      const q2Metrics = calculateQuarterMetrics(selectedQuarter2, item);
      
      const variation = q1Metrics.total !== 0 
        ? ((q2Metrics.total - q1Metrics.total) / q1Metrics.total) * 100 
        : 0;

      return {
        item,
        q1: q1Metrics,
        q2: q2Metrics,
        variation,
        winner: q1Metrics.total > q2Metrics.total ? selectedQuarter1 : selectedQuarter2
      };
    });
  };

  const comparativeMetrics = getComparativeMetrics();

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-3 rounded-lg shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Análisis Trimestral Comparativo</h1>
              <p className="text-sm text-gray-800">Período: {periodLabel} - Análisis por Q1, Q2, Q3, Q4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Selección */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Análisis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Selector Trimestre 1 */}
          <div>
            
            <select
              value={selectedQuarter1}
              onChange={(e) => setSelectedQuarter1(e.target.value as QuarterKey)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-400"
            >
              {Object.entries(QUARTERS).map(([key, quarter]) => (
                <option key={key} value={key} className="py-2">
                  {quarter.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-700 mt-1">Trimestre de referencia</p>
          </div>

          {/* Selector Trimestre 2 */}
          <div>
            
            <select
              value={selectedQuarter2}
              onChange={(e) => setSelectedQuarter2(e.target.value as QuarterKey)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-400"
            >
              {Object.entries(QUARTERS).map(([key, quarter]) => (
                <option key={key} value={key} className="py-2">
                  {quarter.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-700 mt-1">Trimestre a comparar</p>
          </div>

          {/* Tipo de Análisis */}
          <div>
            
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value as 'comparison' | 'evolution')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-400"
            >
              <option value="comparison" className="py-2">Comparación Trimestral</option>
              <option value="evolution" className="py-2">Evolución Mensual</option>
            </select>
            <p className="text-xs text-gray-700 mt-1">Modo de visualización</p>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg mb-1">
                {analysisType === 'comparison' }
              </div>
              <p className="font-bold text-purple-900 text-sm mb-1">
                {analysisType === 'comparison' ? 'Comparando' : 'Evolución'}
              </p>
              <p className="text-xs text-purple-800 font-medium">
                {QUARTERS[selectedQuarter1].shortLabel} vs {QUARTERS[selectedQuarter2].shortLabel}
              </p>
              <div className="mt-2 pt-2 border-t border-purple-200">
                <p className="text-xs text-purple-700">
                  {selectedItems.length} ítems seleccionados
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Ítems */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-900">
              🏷️ Ítems a Analizar
            </label>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                {selectedItems.length} seleccionados
              </span>
              {selectedItems.length > 0 && (
                <button
                  onClick={() => setSelectedItems([])}
                  className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full hover:bg-red-200 transition-colors"
                >
                  Limpiar todo
                </button>
              )}
              <button
                onClick={() => setSelectedItems(availableItems.slice(0, 5))}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200 transition-colors"
              >
                Seleccionar top 5
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {availableItems.map((item, index) => (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 text-left relative group ${
                  selectedItems.includes(item)
                    ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-md'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-purple-300 hover:bg-purple-25 hover:shadow-sm'
                }`}
                title={item}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-bold">
                    #{index + 1}
                  </span>
                  <span className="truncate flex-1">{item}</span>
                  {selectedItems.includes(item) && (
                    <span className="text-purple-600 text-xs">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {selectedItems.length === 0 && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-700">
                💡 Selecciona uno o más ítems para comenzar el análisis trimestral
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6" ref={contentRef}>
        <div className="h-96">
          {selectedItems.length > 0 ? (
            analysisType === 'comparison' ? (
              <Bar data={comparisonChartData} options={comparisonOptions} />
            ) : (
              <Line data={evolutionChartData} options={evolutionOptions} />
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Selecciona ítems para analizar</h3>
                <p className="mt-2 text-sm text-gray-700">Elige los elementos que deseas comparar entre trimestres</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Comparativas */}
      {selectedItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          {comparativeMetrics.map((metric) => (
            <div key={metric.item} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <h4 className="font-semibold text-gray-900 mb-4">{metric.item}</h4>
              
                <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-800 font-medium">{QUARTERS[selectedQuarter1].label}</span>
                  <span className="font-medium text-blue-600">
                    ${metric.q1.total.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-800 font-medium">{QUARTERS[selectedQuarter2].label}</span>
                  <span className="font-medium text-green-600">
                    ${metric.q2.total.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Variación</span>
                    <span className={`font-bold ${
                      metric.variation >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.variation >= 0 ? '+' : ''}{metric.variation.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-900">Mejor Trimestre</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      metric.winner === selectedQuarter1 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {QUARTERS[metric.winner].label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notas */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <label className="text-sm font-semibold text-gray-900">
            Notas del Análisis Trimestral
          </label>
          <span className="text-xs text-gray-700 ml-auto">
            {notes.length} / 5,000 caracteres
          </span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => {
            if (e.target.value.length <= 5000) {
              setNotes(e.target.value);
            }
          }}
          placeholder="Agrega tus observaciones sobre el análisis trimestral, patrones estacionales, tendencias identificadas..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all duration-200 text-gray-900 placeholder-gray-600"
          rows={4}
        />
      </div>
    </div>
  );
}