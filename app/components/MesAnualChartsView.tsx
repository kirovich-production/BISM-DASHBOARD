'use client';

import { useState, useMemo, useRef } from 'react';
import type { ExcelRow } from '@/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MesAnualChartsViewProps {
  data: ExcelRow[];
  periodLabel: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];



export default function MesAnualChartsView({ data, periodLabel }: MesAnualChartsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('Febrero');
  const [selectedItemForChart, setSelectedItemForChart] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);



  // Función para limpiar valores numéricos
  const parseValue = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value
        .replace(/[$%\s]/g, '')
        .replace(/,/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Preparar datos para la tabla - TODOS los ítems del mes seleccionado
  const tableData = useMemo(() => {
    const selectedMonthIndex = MONTHS.indexOf(selectedMonth);
    
    // Primero encontrar y calcular el acumulado de Ventas Netas (referencia base)
    const ventasNetasRow = data.find((row: ExcelRow) => 
      row.Item?.toLowerCase().includes('ventas netas') || 
      row.Item?.toLowerCase().includes('ventas afectas') ||
      row.Item === 'Ventas Netas'
    );
    
    let ventasNetasAcumulado = 0;
    if (ventasNetasRow) {
      for (let i = 0; i <= selectedMonthIndex; i++) {
        const monthName = MONTHS[i];
        const monthValue = parseValue(ventasNetasRow[`${monthName} Monto`]);
        ventasNetasAcumulado += monthValue;
      }
    }
    
    return data.map((row: ExcelRow) => {
      // Calcular acumulado hasta el mes seleccionado para cada ítem
      let acumuladoValue = 0;
      for (let i = 0; i <= selectedMonthIndex; i++) {
        const monthName = MONTHS[i];
        const monthValue = parseValue(row[`${monthName} Monto`]);
        acumuladoValue += monthValue;
      }

      const mesValue = parseValue(row[`${selectedMonth} Monto`]);
      
      // Calcular porcentaje basado en Ventas Netas como referencia
      let porcentajeValue = 0;
      if (row.Item?.toLowerCase().includes('ventas netas') || 
          row.Item?.toLowerCase().includes('ventas afectas') ||
          row.Item === 'Ventas Netas') {
        // Ventas Netas siempre es 100%
        porcentajeValue = 100;
      } else {
        // Otros ítems calculan su peso relativo respecto a Ventas Netas
        porcentajeValue = ventasNetasAcumulado > 0 ? (acumuladoValue / ventasNetasAcumulado) * 100 : 0;
      }
      
      const promedioValue = selectedMonthIndex > 0 ? acumuladoValue / (selectedMonthIndex + 1) : acumuladoValue;

      return {
        item: row.Item || '',
        mes: mesValue,
        acumulado: acumuladoValue,
        porcentaje: porcentajeValue,
        promedio: promedioValue,
      };
    });
  }, [data, selectedMonth]);

  // Datos para el gráfico del ítem seleccionado
  const chartData = useMemo(() => {
    if (!selectedItemForChart) return null;

    const selectedRow = tableData.find(row => row.item === selectedItemForChart);
    if (!selectedRow) return null;

    return {
      labels: [selectedMonth, 'Acumulado', 'Promedio', '% vs Base'],
      datasets: [
        // Dataset para valores monetarios
        {
          label: 'Monetarios',
          data: [selectedRow.mes, selectedRow.acumulado, selectedRow.promedio, null],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(6, 182, 212, 0.8)', 
            'rgba(34, 197, 94, 0.8)',
            'transparent'
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(6, 182, 212, 1)',
            'rgba(34, 197, 94, 1)', 
            'transparent'
          ],
          borderWidth: 2,
          borderRadius: 8,
          yAxisID: 'y',
          categoryPercentage: 0.6,
          barPercentage: 0.8,
          skipNull: true,
        },
        // Dataset para porcentaje
        {
          label: 'Porcentaje',
          data: [null, null, null, selectedRow.porcentaje],
          backgroundColor: [
            'transparent',
            'transparent',
            'transparent',
            'rgba(168, 85, 247, 0.8)'
          ],
          borderColor: [
            'transparent',
            'transparent', 
            'transparent',
            'rgba(168, 85, 247, 1)'
          ],
          borderWidth: 2,
          borderRadius: 8,
          yAxisID: 'y1',
          categoryPercentage: 0.6,
          barPercentage: 0.8,
          skipNull: true,
        },
      ],
    };
  }, [selectedItemForChart, tableData, selectedMonth]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `${selectedItemForChart}`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#1f2937',
      },
      tooltip: {
        callbacks: {
          label: function(tooltipItem: TooltipItem<'bar'>) {
            const label = tooltipItem.label;
            const value = Number(tooltipItem.raw);
            
            if (label === '% vs Base') {
              return `${label}: ${value.toFixed(2)}%`;
            } else {
              return `${label}: ${new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)}`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Valores Monetarios (CLP)',
          color: '#6b7280',
          font: {
            size: 12,
          }
        },
        ticks: {
          callback: function(value: string | number) {
            return new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Number(value));
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Porcentaje (%)',
          color: '#8b5cf6',
          font: {
            size: 12,
          }
        },
        ticks: {
          callback: function(value: string | number) {
            return `${Number(value).toFixed(1)}%`;
          }
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        ticks: {
          maxRotation: 0,
          font: {
            size: 12,
          }
        }
      }
    }
  };

  // Función para generar PDF
  const generatePDF = async () => {
    if (tableData.length === 0) {
      alert('No hay datos para generar el PDF.');
      return;
    }

    if (!contentRef.current) {
      alert('Error: No se encontró el contenedor.');
      return;
    }

    setIsGeneratingPdf(true);
    console.log('🎯 Iniciando generación de PDF Mes-Anual...');

    try {
      // Esperar un momento para que se renderice
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar el contenido completo
      const { default: html2canvas } = await import('html2canvas');
      
      const canvas = await html2canvas(contentRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
        windowWidth: 1920,
        windowHeight: 1080,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        removeContainer: true,
        onclone: function(clonedDoc: Document) {
          const clonedBody = clonedDoc.body;
          if (clonedBody) {
            clonedBody.style.setProperty('-webkit-font-smoothing', 'antialiased');
            clonedBody.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
            clonedBody.style.textRendering = 'optimizeQuality';
          }
        },
      });
      
      const chartImageData = canvas.toDataURL('image/png', 1.0);
      console.log('📊 Contenido capturado como imagen');

      // Generar HTML para Browserless
      const currentDate = new Date().toLocaleString('es-CL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comparación ${selectedMonth} vs Anual - ${periodLabel}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: #ffffff;
              color: #1f2937;
              line-height: 1.5;
              padding: 30px;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeQuality;
              font-feature-settings: "liga" 1, "calt" 1;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
              transform: scale(1);
              transform-origin: top left;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #3b82f6;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .icon-container {
              background: linear-gradient(135deg, #3b82f6, #8b5cf6);
              padding: 12px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            .icon {
              width: 24px;
              height: 24px;
              color: white;
            }
            .title {
              font-size: 32px;
              font-weight: 800;
              color: #111827;
              margin-bottom: 4px;
            }
            .subtitle {
              font-size: 16px;
              color: #6b7280;
              font-weight: 500;
            }
            .date-info {
              text-align: right;
              color: #6b7280;
              font-size: 14px;
            }
            .content-container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
              padding: 30px;
              margin-bottom: 40px;
              border: 1px solid #e5e7eb;
            }
            .content-image {
              width: 100%;
              height: auto;
              border-radius: 8px;
              display: block;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: -moz-crisp-edges;
              image-rendering: crisp-edges;
              image-rendering: pixelated;
              image-orientation: none;
              object-fit: contain;
              object-position: center;
              backface-visibility: hidden;
              transform: translateZ(0);
            }
            .notes-section {
              background: white;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
              padding: 30px;
              border: 1px solid #e5e7eb;
              ${notes && notes.trim() ? '' : 'display: none;'}
            }
            .notes-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #f3f4f6;
            }
            .notes-icon {
              width: 20px;
              height: 20px;
              color: #3b82f6;
            }
            .notes-title {
              font-size: 20px;
              font-weight: 700;
              color: #111827;
            }
            .notes-content {
              background: #f9fafb;
              padding: 20px;
              border-radius: 12px;
              border: 1px solid #e5e7eb;
              font-size: 14px;
              line-height: 1.7;
              color: #374151;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body { padding: 20px; }
              .content-container { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <div class="icon-container">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 class="title">Comparación ${selectedMonth} vs Anual</h1>
                <p class="subtitle">Período: ${periodLabel}</p>
              </div>
            </div>
            <div class="date-info">
              <p><strong>Generado:</strong> ${currentDate}</p>
              <p>BISM Dashboard</p>
            </div>
          </div>

          <div class="content-container">
            <img src="${chartImageData}" alt="Comparación ${selectedMonth} vs Anual" class="content-image" />
          </div>

          ${notes && notes.trim() ? `
          <div class="notes-section">
            <div class="notes-header">
              <svg class="notes-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h2 class="notes-title">Notas y Observaciones</h2>
            </div>
            <div class="notes-content">${notes.replace(/\n/g, '\n')}</div>
          </div>
          ` : ''}

          <div class="footer">
            <span>Documento generado automáticamente por BISM Dashboard</span>
            <span>Comparación ${selectedMonth} vs Datos Anuales - ${periodLabel}</span>
          </div>
        </body>
        </html>
      `;

      // Enviar a Browserless
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          title: `comparacion-${selectedMonth.toLowerCase()}-anual-${periodLabel}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.useClientFallback) {
          throw new Error('Browserless no disponible, usando método local');
        }
        throw new Error(`Error del servidor: ${response.statusText}`);
      }

      // Descargar PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `comparacion-${selectedMonth.toLowerCase()}-anual-${periodLabel}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ PDF generado exitosamente');
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay datos disponibles</h3>
          <p className="mt-2 text-sm text-gray-500">
            Carga un archivo de Excel para visualizar la comparación
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8" ref={contentRef}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Comparación Mes vs Anual</h1>
              <p className="text-sm text-gray-600">Período: {periodLabel}</p>
            </div>
          </div>
          
          {/* Botón Exportar PDF */}
          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf || tableData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
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

      {/* Controles */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Comparación</h3>
        
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Selector de Mes */}
          <div className="flex-shrink-0 w-full sm:w-auto sm:min-w-48">
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-400"
            >
              {MONTHS.map(month => (
                <option key={month} value={month} className="text-gray-900 font-medium py-2">
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Info Compacta */}
          <div className="flex items-center flex-1 max-w-md">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3 flex items-center gap-3 w-full">
              <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-blue-900 text-sm truncate">📊 Análisis Activo</p>
                <p className="text-xs text-blue-800 truncate">{selectedMonth} vs Datos Anuales</p>
              </div>
            </div>
          </div>
        </div>


      </div>



      {/* Layout Principal - 2 Columnas */}
      {tableData.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
          
          {/* Tabla de Datos - 60% del ancho */}
          <div className="xl:col-span-3 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedMonth} vs Datos Anuales - {periodLabel}
                </h3>
                <p className="text-sm text-gray-600">
                  Haz clic en una fila para ver el gráfico detallado
                </p>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  {/* Primera columna - Ítem */}
                  <th className="px-6 py-3 text-left text-xs font-bold text-white bg-indigo-600 border border-gray-300 uppercase tracking-wider">
                    Ítem
                  </th>
                  {/* Segunda columna - Mes actual */}
                  <th className="px-4 py-3 text-center text-xs font-bold text-white bg-blue-600 border border-gray-300 uppercase tracking-wider">
                    {selectedMonth}
                  </th>
                  {/* Tercera columna - Acumulado 2024 */}
                  <th className="px-4 py-3 text-center text-xs font-bold text-white bg-cyan-600 border border-gray-300 uppercase tracking-wider">
                    Acumulado 2024
                  </th>
                  {/* Cuarta columna - % */}
                  <th className="px-4 py-3 text-center text-xs font-bold text-white bg-cyan-600 border border-gray-300 uppercase tracking-wider">
                    %
                  </th>
                  {/* Quinta columna - Promedio Anual */}
                  <th className="px-4 py-3 text-center text-xs font-bold text-white bg-cyan-600 border border-gray-300 uppercase tracking-wider">
                    Promedio Anual
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {tableData.map((row, index) => (
                  <tr 
                    key={index} 
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedItemForChart === row.item 
                        ? 'bg-blue-100 border-blue-300 shadow-md' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedItemForChart(selectedItemForChart === row.item ? '' : row.item)}
                  >
                    {/* Primera columna - Ítem con fondo blanco y borde fuerte */}
                    <td className={`px-6 py-3 text-sm font-semibold text-black border border-gray-300 text-left ${
                      selectedItemForChart === row.item ? 'bg-blue-100' : 'bg-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        {selectedItemForChart === row.item && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {row?.item}
                      </div>
                    </td>
                    {/* Segunda columna - Mes actual con fondo azul claro */}
                    <td className={`px-4 py-3 text-sm font-medium text-black border border-gray-300 text-center ${
                      selectedItemForChart === row.item ? 'bg-blue-200' : 'bg-blue-50'
                    }`}>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(row?.mes || 0)}
                    </td>
                    {/* Tercera columna - Acumulado con fondo celeste claro */}
                    <td className={`px-4 py-3 text-sm font-medium text-black border border-gray-300 text-center ${
                      selectedItemForChart === row.item ? 'bg-cyan-200' : 'bg-cyan-50'
                    }`}>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(row?.acumulado || 0)}
                    </td>
                    {/* Cuarta columna - Porcentaje con fondo celeste claro */}
                    <td className={`px-4 py-3 text-sm font-bold text-black border border-gray-300 text-center ${
                      selectedItemForChart === row.item ? 'bg-cyan-200' : 'bg-cyan-50'
                    }`}>
                      {(row?.porcentaje || 0).toFixed(2)}%
                    </td>
                    {/* Quinta columna - Promedio con fondo celeste claro */}
                    <td className={`px-4 py-3 text-sm font-medium text-black border border-gray-300 text-center ${
                      selectedItemForChart === row.item ? 'bg-cyan-200' : 'bg-cyan-50'
                    }`}>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(row?.promedio || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Área del Gráfico - 40% del ancho */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 p-3 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Gráfico Interactivo</h3>
              <p className="text-sm text-gray-600">
                {selectedItemForChart ? `Detalles de: ${selectedItemForChart}` : 'Selecciona un ítem de la tabla'}
              </p>
            </div>
          </div>

          {selectedItemForChart && chartData ? (
            <div className="h-200">
              <Bar data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-200 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <p className="text-sm font-medium">Haz clic en una fila de la tabla</p>
                <p className="text-xs">para ver el gráfico detallado</p>
              </div>
            </div>
          )}
        </div>
        
        </div>
      )}

      {/* Notas y Observaciones */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <label htmlFor="mesanual-notes" className="text-sm font-semibold text-gray-900">
            Notas y Observaciones
          </label>
          <span className="text-xs text-gray-500 ml-auto">
            {notes.length} / 10,000 caracteres
          </span>
        </div>
        <textarea
          id="mesanual-notes"
          value={notes}
          onChange={(e) => {
            if (e.target.value.length <= 10000) {
              setNotes(e.target.value);
            }
          }}
          placeholder="Escribe tus notas sobre la comparación mes vs anual..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 text-gray-900 placeholder-gray-400"
          style={{
            minHeight: '80px',
            maxHeight: '400px',
            height: notes.length > 200 ? `${Math.min(80 + Math.floor(notes.length / 200) * 20, 400)}px` : '80px'
          }}
        />
      </div>
    </div>
  );
}