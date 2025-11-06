'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';

ChartJS.register(
  CategoryScale,
  LinearScale,
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

interface EERRData {
  sheetName: string;
  months: string[];
  categories: Array<{
    name: string;
    rows: Array<{
      Item: string;
      [key: string]: string | number | undefined;
    }>;
  }>;
}

interface ComparativoEbitdaViewProps {
  consolidadoData: ExcelRow[];
  sevillaData: EERRData | null;
  labranzaData: EERRData | null;
  selectedUserName?: string;
  selectedPeriod?: string;
}

export default function ComparativoEbitdaView({ consolidadoData, sevillaData, labranzaData, selectedUserName, selectedPeriod }: ComparativoEbitdaViewProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [notes, setNotes] = useState('');
  const [showPercentages, setShowPercentages] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Cargando gráfico...</span>
        </div>
      </div>
    );
  }

  // Función para parsear valores monetarios (mejorada)
  const parseValue = (value: string | number | undefined): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Manejar casos especiales
      if (value.includes('#DIV/0!') || value.trim() === '$0' || value.trim() === '') return 0;
      
      // Limpiar: remover $, espacios, pero mantener números y comas
      let cleaned = value.replace(/[$\s]/g, '');
      
      // Si hay comas, asumir que son separadores de miles (formato: 2,365,037)
      cleaned = cleaned.replace(/,/g, '');
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Función para extraer EBITDA de una tabla específica (formato antiguo - Consolidado)
  const getEbitdaFromConsolidado = (data: ExcelRow[], tableName: string) => {
    const ebitdaRow = data?.find(row => 
      row.Item && typeof row.Item === 'string' && 
      row.Item.toLowerCase().includes('ebidta')
    );

    console.log(`=== ${tableName.toUpperCase()} DEBUG (Consolidado) ===`);
    console.log(`EBITDA Row encontrada:`, ebitdaRow?.Item);

    const monthKeys = [
      'Enero Monto', 'Febrero Monto', 'Marzo Monto', 'Abril Monto', 'Mayo Monto', 'Junio Monto',
      'Julio Monto', 'Agosto Monto', 'Septiembre Monto', 'Octubre Monto', 'Noviembre Monto', 'Diciembre Monto'
    ];
    
    return monthKeys.map((monthKey, index) => {
      const value = ebitdaRow ? parseValue(ebitdaRow[monthKey]) : 0;
      if (index < 3) {
        console.log(`${tableName} - ${monthKey}:`, ebitdaRow?.[monthKey], '→', value);
      }
      return value;
    });
  };

  // Función para extraer EBITDA de formato EERR (Sevilla/Labranza)
  const getEbitdaFromEERR = (data: EERRData | null, tableName: string) => {
    if (!data || !data.categories) {
      console.log(`=== ${tableName.toUpperCase()} DEBUG (EERR) ===`);
      console.log(`No data available for ${tableName}`);
      return Array(12).fill(0); // 12 meses con valor 0
    }

    console.log(`=== ${tableName.toUpperCase()} DEBUG (EERR) ===`);
    console.log(`Categories available:`, data.categories.map(cat => cat.name));
    console.log(`Full data structure:`, JSON.stringify(data, null, 2));

    // Buscar EBITDA en todas las categorías - probar diferentes variantes
    let ebitdaRow = null;
    for (const category of data.categories) {
      console.log(`Searching in category: ${category.name}, rows:`, category.rows?.length || 0);
      
      // Mostrar todas las filas disponibles en esta categoría
      if (category.rows) {
        category.rows.forEach((row, idx) => {
          if (idx < 5) { // Mostrar solo las primeras 5 filas
            console.log(`  Row ${idx}: "${row.Item}"`);
          }
        });
      }
      
      // Buscar EBITDA con diferentes variantes
      ebitdaRow = category.rows?.find(row => 
        row.Item && typeof row.Item === 'string' && (
          row.Item.toLowerCase().includes('ebidta') ||
          row.Item.toLowerCase().includes('ebitda') ||
          row.Item.toLowerCase() === 'ebidta' ||
          row.Item.toLowerCase() === 'ebitda'
        )
      );
      
      if (ebitdaRow) {
        console.log(`Found EBITDA in category: ${category.name}, Item: "${ebitdaRow.Item}"`);
        break;
      }
    }

    if (!ebitdaRow) {
      console.log(`EBITDA Row NOT FOUND in ${tableName}`);
      return Array(12).fill(0);
    }

    console.log(`EBITDA Row encontrada:`, ebitdaRow?.Item);
    console.log(`All keys in EBITDA row:`, Object.keys(ebitdaRow));

    const monthKeys = [
      'ENERO Monto', 'FEBRERO Monto', 'MARZO Monto', 'ABRIL Monto', 'MAYO Monto', 'JUNIO Monto',
      'JULIO Monto', 'AGOSTO Monto', 'SEPTIEMBRE Monto', 'OCTUBRE Monto', 'NOVIEMBRE Monto', 'DICIEMBRE Monto'
    ];
    
    return monthKeys.map((monthKey, index) => {
      const rawValue = ebitdaRow?.[monthKey];
      const value = ebitdaRow ? parseValue(rawValue) : 0;
      if (index < 3) {
        console.log(`${tableName} - ${monthKey}:`, rawValue, '→', value, `(type: ${typeof rawValue})`);
      }
      return value;
    });
  };

  // Función para extraer EBITDA % de Consolidado
  const getEbitdaPercentageFromConsolidado = (data: ExcelRow[], tableName: string) => {
    const ebitdaRow = data?.find(row => 
      row.Item && typeof row.Item === 'string' && 
      row.Item.toLowerCase().includes('ebidta')
    );

    if (!ebitdaRow) {
      console.log(`EBITDA % Row NOT FOUND in ${tableName}`);
      return Array(12).fill(0);
    }

    const monthKeys = [
      'Enero %', 'Febrero %', 'Marzo %', 'Abril %', 'Mayo %', 'Junio %',
      'Julio %', 'Agosto %', 'Septiembre %', 'Octubre %', 'Noviembre %', 'Diciembre %'
    ];

    return monthKeys.map((key) => {
      const rawValue = ebitdaRow[key];
      if (!rawValue || rawValue === '#DIV/0!') return 0;
      
      // Limpiar porcentaje: "2.62%" -> 2.62
      const cleaned = String(rawValue).replace('%', '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    });
  };

  // Función para extraer EBITDA % de EERR (Sevilla/Labranza)
  const getEbitdaPercentageFromEERR = (data: EERRData | null) => {
    if (!data || !data.categories) {
      return Array(12).fill(0);
    }

    // Buscar EBITDA en todas las categorías
    let ebitdaRow = null;
    for (const category of data.categories) {
      ebitdaRow = category.rows?.find(row => 
        row.Item && typeof row.Item === 'string' && (
          row.Item.toLowerCase().includes('ebidta') ||
          row.Item.toLowerCase().includes('ebitda')
        )
      );
      
      if (ebitdaRow) break;
    }

    if (!ebitdaRow) {
      return Array(12).fill(0);
    }

    const monthKeys = [
      'ENERO %', 'FEBRERO %', 'MARZO %', 'ABRIL %', 'MAYO %', 'JUNIO %',
      'JULIO %', 'AGOSTO %', 'SEPTIEMBRE %', 'OCTUBRE %', 'NOVIEMBRE %', 'DICIEMBRE %'
    ];
    
    return monthKeys.map((monthKey) => {
      const rawValue = ebitdaRow?.[monthKey];
      if (!rawValue || rawValue === '#DIV/0!') return 0;
      
      // Limpiar porcentaje: "2.62%" -> 2.62
      const cleaned = String(rawValue).replace('%', '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    });
  };

  // Obtener datos EBITDA de las tres fuentes
  const consolidadoEbitda = getEbitdaFromConsolidado(consolidadoData, 'Consolidado');
  const sevillaEbitda = getEbitdaFromEERR(sevillaData, 'Sevilla');
  const labranzaEbitda = getEbitdaFromEERR(labranzaData, 'Labranza');

  // Obtener datos EBITDA % de las tres fuentes
  const consolidadoEbitdaPercent = getEbitdaPercentageFromConsolidado(consolidadoData, 'Consolidado');
  const sevillaEbitdaPercent = getEbitdaPercentageFromEERR(sevillaData);
  const labranzaEbitdaPercent = getEbitdaPercentageFromEERR(labranzaData);

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Configuración del gráfico comparativo de líneas
  const chartData = {
    labels: months,
    datasets: [
      {
        label: showPercentages ? 'EBITDA % Consolidado' : 'EBITDA Consolidado',
        data: showPercentages ? consolidadoEbitdaPercent : consolidadoEbitda,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 3,
        borderDash: [5, 5], // Línea punteada
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        tension: 0.4
      },
      {
        label: showPercentages ? 'EBITDA % Sevilla' : 'EBITDA Sevilla',
        data: showPercentages ? sevillaEbitdaPercent : sevillaEbitda,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(147, 51, 234, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.4
      },
      {
        label: showPercentages ? 'EBITDA % Labranza' : 'EBITDA Labranza',
        data: showPercentages ? labranzaEbitdaPercent : labranzaEbitda,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.4
      }
    ]
  };

  const options: ChartOptions<'line'> = {
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
        text: `Comparativo EBITDA por Centro ${showPercentages ? '(%)' : '(CLP)'} - ${selectedUserName || 'Usuario'} - ${selectedPeriod || 'Período'}`,
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
            
            if (showPercentages) {
              return `${context.dataset.label}: ${value.toFixed(2)}%`;
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
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
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
        position: 'left' as const,
        title: {
          display: true,
          text: showPercentages ? 'EBITDA (%)' : 'EBITDA (CLP)',
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
          color: '#6b7280',
          callback: function(value) {
            if (showPercentages) {
              return `${(value as number).toFixed(1)}%`;
            } else {
              const formatter = new Intl.NumberFormat('es-CL', {
                notation: 'compact',
                compactDisplay: 'short',
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
              });
              return formatter.format(value as number);
            }
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
      pdf.setTextColor(34, 139, 34);
      pdf.text(`Comparativo EBITDA por Centro - ${selectedUserName || 'Usuario'}`, 20, 20);
      
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
      pdf.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 20, 280);
      
      pdf.save(`comparativo-ebitda-${selectedUserName || 'usuario'}-${selectedPeriod || 'periodo'}.pdf`);
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
            📊 Comparativo EBITDA por Centro
          </h2>
          <p className="text-gray-600">
            Evolución mensual: Consolidado vs. Sevilla vs. Labranza
          </p>
          <div className="mt-2 text-sm text-gray-500">
            <span className="font-medium">Usuario:</span> {selectedUserName || 'No seleccionado'} | 
            <span className="font-medium ml-2">Período:</span> {selectedPeriod || 'No seleccionado'}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowPercentages(!showPercentages)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showPercentages 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {showPercentages ? 'Ver CLP' : 'Ver %'}
          </button>
          
          <button
            onClick={exportPDF}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-[600px] mb-6">
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-700 text-sm font-medium">
            EBITDA Promedio Consolidado {showPercentages ? '(%)' : '(CLP)'}
          </div>
          <div className="text-blue-900 text-lg font-bold">
            {showPercentages ? (
              `${(consolidadoEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitdaPercent.length).toFixed(2)}%`
            ) : (
              `$${(consolidadoEbitda.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitda.length).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            )}
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-700 text-sm font-medium">
            EBITDA Promedio Sevilla {showPercentages ? '(%)' : '(CLP)'}
          </div>
          <div className="text-purple-900 text-lg font-bold">
            {showPercentages ? (
              `${(sevillaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitdaPercent.length).toFixed(2)}%`
            ) : (
              `$${(sevillaEbitda.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitda.length).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            )}
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-700 text-sm font-medium">
            EBITDA Promedio Labranza {showPercentages ? '(%)' : '(CLP)'}
          </div>
          <div className="text-green-900 text-lg font-bold">
            {showPercentages ? (
              `${(labranzaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitdaPercent.length).toFixed(2)}%`
            ) : (
              `$${(labranzaEbitda.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitda.length).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            )}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas del comparativo:
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Agrega tus observaciones sobre la evolución comparativa del EBITDA entre centros..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}