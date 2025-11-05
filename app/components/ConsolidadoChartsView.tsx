'use client';

import { useState, useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartDataset,
} from 'chart.js';
import type { ExcelRow } from '@/types';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ConsolidadoChartsViewProps {
  data: ExcelRow[];
  periodLabel: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Colores suaves predefinidos para los ítems
const ITEM_COLORS: { [key: string]: string } = {
  'Ventas': '#60a5fa',                    // blue-400 (suave)
  'Costos Directos': '#f87171',           // red-400 (suave)
  'EBITDA': '#34d399',                    // green-400 (suave)
  'Utilidad': '#a78bfa',                  // violet-400 (suave)
  'Gastos Operacionales': '#fbbf24',      // amber-400 (suave)
  'Margen Bruto': '#22d3ee',              // cyan-400 (suave)
  'Otros Ingresos': '#f472b6',            // pink-400 (suave)
  'Otros Gastos': '#fb923c',              // orange-500 (suave)
  'Depreciación': '#818cf8',              // indigo-400 (suave)
  'Amortización': '#c084fc',              // purple-400 (suave)
  'Resultado Operacional': '#4ade80',     // green-400 (suave)
  'Gastos Financieros': '#fb7185',        // rose-400 (suave)
  'Ingresos Financieros': '#2dd4bf',      // teal-400 (suave)
  'Resultado Antes Impuesto': '#a3e635',  // lime-400 (suave)
  'Impuesto Renta': '#fca5a5',            // red-300 (muy suave)
  'Resultado Neto': '#86efac',            // green-300 (muy suave)
};

// Colores adicionales suaves para ítems no predefinidos
const FALLBACK_COLORS = [
  '#93c5fd', '#fca5a5', '#6ee7b7', '#c4b5fd', '#fcd34d',
  '#67e8f9', '#f9a8d4', '#fdba74', '#a5b4fc', '#d8b4fe',
  '#bef264', '#fda4af', '#5eead4', '#d9f99d', '#fbbf24',
];

// Función para obtener color de un ítem
const getItemColor = (itemName: string, index: number): string => {
  return ITEM_COLORS[itemName] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

export default function ConsolidadoChartsView({ data, periodLabel }: ConsolidadoChartsViewProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>(['Ventas', 'EBITDA']);
  const [dataType, setDataType] = useState<'monto' | 'percentage'>('monto');
  const [monthRange, setMonthRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 11
  });
  const [notes, setNotes] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Extraer todos los ítems únicos de los datos
  const availableItems = useMemo(() => {
    return data
      .map(row => row.Item)
      .filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  }, [data]);

  // Preparar datos para la gráfica
  const chartData = useMemo(() => {
    const selectedMonths = MONTHS.slice(monthRange.start, monthRange.end + 1);
    const suffix = dataType === 'monto' ? ' Monto' : ' %';
    
    const datasets = selectedItems.map((itemName, index) => {
      const itemData = data.find(row => row.Item === itemName);
      if (!itemData) return null;

      const values = selectedMonths.map(month => {
        const key = `${month}${suffix}`;
        const value = itemData[key];
        
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const cleaned = value.replace(/[$,%\s]/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      });

      const color = getItemColor(itemName, index);
      return {
        label: itemName,
        data: values,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
      } as ChartDataset<'bar', number[]>;
    }).filter(d => d !== null);

    return {
      labels: selectedMonths,
      datasets: datasets,
    };
  }, [data, selectedItems, dataType, monthRange]);

  // Opciones de la gráfica
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 500
          }
        }
      },
      title: {
        display: true,
        text: `Comparación Mensual - ${periodLabel}`,
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (dataType === 'monto') {
              const yValue = context.parsed.y;
              if (yValue !== null && yValue !== undefined) {
                label += new Intl.NumberFormat('es-CL', {
                  style: 'currency',
                  currency: 'CLP',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(yValue);
              }
            } else {
              const yValue = context.parsed.y;
              if (yValue !== null && yValue !== undefined) {
                label += yValue.toFixed(2) + '%';
              }
            }
            return label;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (dataType === 'monto') {
              return new Intl.NumberFormat('es-CL', {
                notation: 'compact',
                compactDisplay: 'short'
              }).format(numValue);
            } else {
              return numValue + '%';
            }
          },
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 11,
            weight: 500
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  // Manejar selección de ítems
  const toggleItem = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  // Función para generar PDF
  const generatePDF = async () => {
    if (!contentRef.current) return;

    setIsGeneratingPdf(true);
    try {
      const content = contentRef.current;
      
      // HTML para el PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page { size: A4 landscape; margin: 15mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 9px;
                color: #1f2937;
                background: white;
                padding: 10px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                margin-bottom: 15px;
              }
              .header h1 { font-size: 18px; margin-bottom: 4px; }
              .header p { font-size: 11px; opacity: 0.9; }
              .chart-container {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
              }
              .notes-section {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
              }
              .notes-section h3 {
                font-size: 12px;
                color: #4f46e5;
                margin-bottom: 8px;
                font-weight: 600;
              }
              .notes-content {
                font-size: 9px;
                color: #374151;
                line-height: 1.5;
                white-space: pre-wrap;
              }
              .metadata {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #e5e7eb;
                font-size: 8px;
                color: #6b7280;
              }
              canvas { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Gráficos de Consolidado</h1>
              <p>Período: ${periodLabel}</p>
            </div>
            ${content.innerHTML}
            ${notes ? `
              <div class="notes-section">
                <h3>📝 Notas y Observaciones</h3>
                <div class="notes-content">${notes}</div>
              </div>
            ` : ''}
            <div class="metadata">
              <span>Generado: ${new Date().toLocaleString('es-CL')}</span>
              <span>Ítems: ${selectedItems.join(', ')}</span>
            </div>
          </body>
        </html>
      `;

      // Intentar con Browserless API
      const apiToken = process.env.NEXT_PUBLIC_BROWSERLESS_API_TOKEN;
      
      if (apiToken) {
        const response = await fetch(`https://chrome.browserless.io/pdf?token=${apiToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: htmlContent,
            options: {
              format: 'A4',
              landscape: true,
              printBackground: true,
              margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
            }
          })
        });

        if (!response.ok) throw new Error('Error en Browserless API');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graficos-consolidado-${periodLabel}-${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback: abrir en nueva ventana para imprimir
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay datos disponibles</h3>
          <p className="mt-2 text-sm text-gray-500">
            Carga un archivo de Excel para visualizar los gráficos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gráficos de Consolidado</h1>
              <p className="text-sm text-gray-600">Período: {periodLabel}</p>
            </div>
          </div>
          
          {/* Botón Exportar PDF */}
          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf || selectedItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isGeneratingPdf ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div ref={contentRef}>
      {/* Controles */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Controles de Visualización</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selector de Tipo de Dato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Dato
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDataType('monto')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  dataType === 'monto'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monto (CLP)
              </button>
              <button
                onClick={() => setDataType('percentage')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  dataType === 'percentage'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Porcentaje (%)
              </button>
            </div>
          </div>

          {/* Rango de Meses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rango de Meses
            </label>
            <div className="flex gap-2">
              <select
                value={monthRange.start}
                onChange={(e) => setMonthRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium"
              >
                {MONTHS.map((month, idx) => (
                  <option key={idx} value={idx} className="text-gray-900 font-medium">{month}</option>
                ))}
              </select>
              <span className="flex items-center text-gray-700 font-medium">a</span>
              <select
                value={monthRange.end}
                onChange={(e) => setMonthRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium"
              >
                {MONTHS.map((month, idx) => (
                  <option key={idx} value={idx} disabled={idx < monthRange.start} className="text-gray-900 font-medium">
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-blue-800">
                <p className="font-semibold">Gráfica de Barras</p>
                <p>Comparación mensual por ítem</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Ítems */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecciona los ítems a visualizar ({selectedItems.length} seleccionados)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableItems.map(item => (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                  selectedItems.includes(item)
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: ITEM_COLORS[item] || '#6b7280' }}
                  />
                  <span className="truncate">{item}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfica */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div style={{ height: '500px' }}>
          {selectedItems.length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Selecciona al menos un ítem para visualizar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notas y Observaciones */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <label htmlFor="chart-notes" className="text-sm font-semibold text-gray-900">
            Notas y Observaciones.
          </label>
          <span className="text-xs text-gray-500 ml-auto">
            {notes.length} / 10,000 caracteres
          </span>
        </div>
        <textarea
          id="chart-notes"
          value={notes}
          onChange={(e) => {
            if (e.target.value.length <= 10000) {
              setNotes(e.target.value);
            }
          }}
          placeholder="Escribe tus notas, observaciones o análisis sobre los datos visualizados..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 text-gray-900 placeholder-gray-400"
          style={{
            minHeight: '80px',
            maxHeight: '400px',
            height: notes.length > 200 ? `${Math.min(80 + Math.floor(notes.length / 200) * 20, 400)}px` : '80px'
          }}
        />
        <p className="mt-2 text-xs text-gray-500">
          Agrega comentarios, insights o conclusiones basadas en el gráfico para compartir con tu equipo.
        </p>
      </div>
      </div>
    </div>
  );
}
