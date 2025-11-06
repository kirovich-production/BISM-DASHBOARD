'use client';

import { useState, useRef } from 'react';
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
import { Chart } from 'react-chartjs-2';
import jsPDF from 'jspdf';

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

// Usar html2canvas para la captura
declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: { backgroundColor?: string }) => Promise<HTMLCanvasElement>;
  }
}

interface ExcelRow {
  Item: string;
  [key: string]: string | number | undefined;
}

interface EbidtaComboViewProps {
  data: ExcelRow[];
  selectedUserName?: string;
  selectedPeriod?: string;
}

export default function EbidtaComboView({ data, selectedUserName, selectedPeriod }: EbidtaComboViewProps) {
  const chartRef = useRef<ChartJS>(null);
  const [notes, setNotes] = useState('');

  // Función para parsear valores monetarios mejorada
  const parseValue = (value: string | number | undefined): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Casos especiales
      if (value === '#DIV/0!' || value === '' || value === '$0') return 0;
      
      // Remover símbolo $ y espacios
      let cleaned = value.replace(/\$|\s/g, '');
      
      // Si tiene comas como separadores de miles (ej: 2,365,037)
      // Las comas están separando miles, no decimales
      if (cleaned.includes(',')) {
        // Remover todas las comas (separadores de miles)
        cleaned = cleaned.replace(/,/g, '');
      }
      
      // Parsear el número final
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Obtener datos para el gráfico combo
  const getComboData = () => {
    // Buscar filas igual que en EbidtaChartsView
    const ebitdaRow = data.find((row: ExcelRow) => 
      row.Item?.toLowerCase().includes('ebitda') || 
      row.Item?.toLowerCase().includes('ebidta')
    );
    
    const ventasNetasRow = data.find((row: ExcelRow) => 
      row.Item?.toLowerCase().includes('ventas netas') || 
      row.Item?.toLowerCase().includes('ventas afectas') ||
      row.Item === 'Ventas Netas'
    );

    // Debug: Mostrar qué filas encontró
    console.log('🔍 [EbidtaComboView] Filas encontradas:');
    console.log('- EBITDA Row:', ebitdaRow?.Item, ebitdaRow);
    console.log('- Ventas Netas Row:', ventasNetasRow?.Item, ventasNetasRow);
    console.log('- Total filas en data:', data.length);
    console.log('- Primeras 3 filas:', data.slice(0, 3));

    // Nombres de meses como están en los datos reales
    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const processedData = SHORT_MONTHS.map((shortMonth, index) => {
      const fullMonth = MONTHS[index];
      const ebitdaRaw = ebitdaRow ? ebitdaRow[`${fullMonth} Monto`] : 0;
      const ventasRaw = ventasNetasRow ? ventasNetasRow[`${fullMonth} Monto`] : 0;
      
      const ebitda = parseValue(ebitdaRaw);
      const ventasNetas = parseValue(ventasRaw);
      
      // Calcular margen EBITDA (%)
      const margenEbitda = ventasNetas !== 0 ? (ebitda / ventasNetas) * 100 : 0;

      // Debug para los primeros 3 meses
      if (index < 3) {
        console.log(`📊 [${fullMonth}] Raw: EBITDA="${ebitdaRaw}", Ventas="${ventasRaw}"`);
        console.log(`📊 [${fullMonth}] Parsed: EBITDA=${ebitda}, Ventas=${ventasNetas}, Margen=${margenEbitda.toFixed(2)}%`);
      }

      return {
        month: shortMonth,
        ebitda,
        ventasNetas,
        margenEbitda
      };
    });

    console.log('📈 [EbidtaComboView] Datos procesados:', processedData.slice(0, 3));
    return processedData;
  };

  const comboData = getComboData();

  // Configuración del gráfico combo
  const chartData = {
    labels: comboData.map(d => d.month),
    datasets: [
      {
        type: 'bar' as const,
        label: 'EBITDA Mensual',
        data: comboData.map(d => d.ebitda),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        yAxisID: 'y'
      },
      {
        type: 'line' as const,
        label: '% Margen EBITDA',
        data: comboData.map(d => d.margenEbitda),
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 3,
        fill: false,
        tension: 0.3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        yAxisID: 'y1'
      }
    ]
  };

  const options: ChartOptions = {
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
        text: `Análisis Combo EBITDA - ${selectedUserName || 'Usuario'} - ${selectedPeriod || 'Período'}`,
        font: {
          size: 18,
          weight: 'bold'
        },
        color: '#1f2937',
        padding: 20
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y || 0;
            if (context.dataset.label?.includes('%')) {
              return `${context.dataset.label}: ${value.toFixed(1)}%`;
            } else {
              const formatter = new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              });
              return `${context.dataset.label}: ${formatter.format(value)}`;
            }
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'EBITDA (CLP)',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(59, 130, 246, 0.1)'
        },
        ticks: {
          color: '#3b82f6',
          callback: function(value) {
            const formatter = new Intl.NumberFormat('es-CL', {
              notation: 'compact',
              compactDisplay: 'short',
              minimumFractionDigits: 0,
              maximumFractionDigits: 1
            });
            return formatter.format(value as number);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Margen EBITDA (%)',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#10b981',
          callback: function(value) {
            return `${(value as number).toFixed(1)}%`;
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  // Función para exportar PDF
  const exportPDF = async () => {
    if (!chartRef.current) return;

    try {
      const chartElement = chartRef.current.canvas.parentElement;
      if (!chartElement) return;

      // Crear una copia del elemento para el PDF
      const clonedElement = chartElement.cloneNode(true) as HTMLElement;
      clonedElement.style.backgroundColor = 'white';
      clonedElement.style.padding = '20px';
      clonedElement.style.width = '800px';
      clonedElement.style.height = '600px';
      
      document.body.appendChild(clonedElement);

      // Usar html2canvas si está disponible, sino usar canvas.toDataURL
      let dataUrl: string;
      if (typeof window !== 'undefined' && window.html2canvas) {
        const canvas = await window.html2canvas(clonedElement, { backgroundColor: 'white' });
        dataUrl = canvas.toDataURL('image/png');
      } else if (chartRef.current) {
        dataUrl = chartRef.current.toBase64Image();
      } else {
        throw new Error('No se pudo capturar el gráfico');
      }

      document.body.removeChild(clonedElement);

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      // Título
      pdf.setFontSize(16);
      pdf.setTextColor(59, 130, 246);
      pdf.text(`Análisis Combo EBITDA - ${selectedUserName || 'Usuario'}`, 20, 20);
      
      // Período
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Período: ${selectedPeriod || 'No especificado'}`, 20, 30);
      
      // Gráfico
      pdf.addImage(dataUrl, 'PNG', 20, 40, 250, 150);
      
      // Notas si existen
      if (notes.trim()) {
        pdf.setFontSize(10);
        pdf.text('Notas:', 20, 200);
        const splitNotes = pdf.splitTextToSize(notes, 250);
        pdf.text(splitNotes, 20, 210);
      }
      
  // Timestamp
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generado el: ${new Date().toLocaleString('es-CL')}`, 20, 280);
      
      pdf.save(`combo-ebitda-${selectedUserName || 'usuario'}-${selectedPeriod || 'periodo'}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Intenta de nuevo.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            📊📈 Análisis Combo EBITDA
          </h2>
          <p className="text-gray-600">
            EBITDA mensual (barras) + % margen EBITDA (línea) - Doble perspectiva del negocio
          </p>
          <div className="mt-2 text-sm text-gray-500">
            <span className="font-medium">Usuario:</span> {selectedUserName || 'No seleccionado'} | 
            <span className="font-medium ml-2">Período:</span> {selectedPeriod || 'No seleccionado'}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={exportPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-96 mb-6">
        <Chart
          type='bar'
          ref={chartRef}
          data={chartData}
          options={options}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {comboData.length > 0 && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-700 text-sm font-medium">EBITDA Promedio</div>
              <div className="text-blue-900 text-lg font-bold">
                ${(comboData.reduce((acc, d) => acc + d.ebitda, 0) / comboData.length).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-700 text-sm font-medium">Margen Promedio</div>
              <div className="text-green-900 text-lg font-bold">
                {(comboData.reduce((acc, d) => acc + d.margenEbitda, 0) / comboData.length).toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-amber-700 text-sm font-medium">EBITDA Máximo</div>
              <div className="text-amber-900 text-lg font-bold">
                ${Math.max(...comboData.map(d => d.ebitda)).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-purple-700 text-sm font-medium">Margen Máximo</div>
              <div className="text-purple-900 text-lg font-bold">
                {Math.max(...comboData.map(d => d.margenEbitda)).toFixed(1)}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Insights Section */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">💡 Insights del Análisis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-700">Valores Absolutos:</span>
            <p className="text-gray-600">Las barras azules muestran el EBITDA mensual en pesos, indicando la generación de valor absoluto.</p>
          </div>
          <div>
            <span className="font-medium text-green-700">Rentabilidad:</span>
            <p className="text-gray-600">La línea verde muestra el % margen EBITDA, indicando la eficiencia operativa del negocio.</p>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas del análisis:
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Agrega tus observaciones sobre el análisis combo del EBITDA..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}