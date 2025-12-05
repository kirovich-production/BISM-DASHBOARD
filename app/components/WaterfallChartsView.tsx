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
import AddToReportButton from './AddToReportButton';

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
  const contentRef = useRef<HTMLDivElement>(null);
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
  const getEbitdaFromConsolidado = (data: ExcelRow[]) => {
    const ebitdaRow = data?.find(row => 
      row.Item && typeof row.Item === 'string' && 
      row.Item.toLowerCase().includes('ebidta')
    );

    const monthKeys = [
      'Enero Monto', 'Febrero Monto', 'Marzo Monto', 'Abril Monto', 'Mayo Monto', 'Junio Monto',
      'Julio Monto', 'Agosto Monto', 'Septiembre Monto', 'Octubre Monto', 'Noviembre Monto', 'Diciembre Monto'
    ];
    
    return monthKeys.map((monthKey, index) => {
      const value = ebitdaRow ? parseValue(ebitdaRow[monthKey]) : 0;
      if (index < 3) {
      }
      return value;
    });
  };

  // Función para extraer EBITDA de formato EERR (Sevilla/Labranza)
  const getEbitdaFromEERR = (data: EERRData | null) => {
    if (!data || !data.categories) {
      return Array(12).fill(0); // 12 meses con valor 0
    }

    // Buscar EBITDA en todas las categorías - probar diferentes variantes
    let ebitdaRow = null;
    for (const category of data.categories) {
      
      // Mostrar todas las filas disponibles en esta categoría
      if (category.rows) {
        category.rows.forEach((row, idx) => {
          if (idx < 5) { // Mostrar solo las primeras 5 filas
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
        break;
      }
    }

    if (!ebitdaRow) {
      return Array(12).fill(0);
    }

    

    const monthKeys = [
      'ENERO Monto', 'FEBRERO Monto', 'MARZO Monto', 'ABRIL Monto', 'MAYO Monto', 'JUNIO Monto',
      'JULIO Monto', 'AGOSTO Monto', 'SEPTIEMBRE Monto', 'OCTUBRE Monto', 'NOVIEMBRE Monto', 'DICIEMBRE Monto'
    ];
    
    return monthKeys.map((monthKey, index) => {
      const rawValue = ebitdaRow?.[monthKey];
      const value = ebitdaRow ? parseValue(rawValue) : 0;
      if (index < 3) {
      }
      return value;
    });
  };

  // Función para extraer EBITDA % de Consolidado
  const getEbitdaPercentageFromConsolidado = (data: ExcelRow[]) => {
    const ebitdaRow = data?.find(row => 
      row.Item && typeof row.Item === 'string' && 
      row.Item.toLowerCase().includes('ebidta')
    );

    if (!ebitdaRow) {
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
  const consolidadoEbitda = getEbitdaFromConsolidado(consolidadoData);
  const sevillaEbitda = getEbitdaFromEERR(sevillaData);
  const labranzaEbitda = getEbitdaFromEERR(labranzaData);

  // Obtener datos EBITDA % de las tres fuentes
  const consolidadoEbitdaPercent = getEbitdaPercentageFromConsolidado(consolidadoData);
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

  // Función para generar HTML del reporte (sin notas, layout horizontal)
  const generateComparativoEbitdaHTML = async (): Promise<string> => {
    // Capturar el gráfico
    let chartImageBase64 = '';
    if (chartRef.current) {
      try {
        const canvas = chartRef.current.canvas;
        if (canvas) {
          chartImageBase64 = canvas.toDataURL('image/png', 0.95);
        }
      } catch (error) {
        console.warn('⚠️ Error capturando gráfico:', error);
      }
    }

    // Calcular promedios
    const consolidadoPromedio = showPercentages 
      ? parseFloat((consolidadoEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitdaPercent.length).toFixed(2))
      : (consolidadoEbitda.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitda.length);
    
    const sevillaPromedio = showPercentages 
      ? parseFloat((sevillaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitdaPercent.length).toFixed(2))
      : (sevillaEbitda.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitda.length);
    
    const labranzaPromedio = showPercentages 
      ? parseFloat((labranzaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitdaPercent.length).toFixed(2))
      : (labranzaEbitda.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitda.length);

    const formatValue = (value: number): string => {
      if (showPercentages) {
        return `${value.toFixed(2)}%`;
      }
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(value);
    };

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comparativo EBITDA por Centro</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0.4in;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            color: #1f2937;
            background: white;
            margin: 0;
            padding: 0;
          }
          
          .ebitda-container {
            display: grid;
            grid-template-rows: auto 1fr auto;
            gap: 4px;
            height: auto;
            padding: 2px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .ebitda-title {
            font-size: 12px;
            font-weight: bold;
            color: #1f2937;
            border-bottom: 1px solid #22c55e;
            padding-bottom: 2px;
            margin-bottom: 2px;
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .ebitda-chart {
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          
          .ebitda-chart .chart-image {
            width: 100%;
            height: auto;
            max-height: 420px;
            object-fit: contain;
            border-radius: 4px;
          }
          
          .ebitda-cards {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-top: 4px;
          }
          
          .ebitda-card {
            background: white;
            border-radius: 6px;
            padding: 8px 10px;
            border: 2px solid #e5e7eb;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          
          .ebitda-card-consolidado {
            border-left: 5px solid #3b82f6;
            background: #eff6ff;
          }
          
          .ebitda-card-sevilla {
            border-left: 5px solid #8b5cf6;
            background: #f3e8ff;
          }
          
          .ebitda-card-labranza {
            border-left: 5px solid #10b981;
            background: #ecfdf5;
          }
          
          .ebitda-card .card-title {
            font-size: 9px;
            font-weight: 700;
            margin-bottom: 6px;
            line-height: 1.2;
          }
          
          .ebitda-card-consolidado .card-title {
            color: #1e40af;
          }
          
          .ebitda-card-sevilla .card-title {
            color: #7c3aed;
          }
          
          .ebitda-card-labranza .card-title {
            color: #059669;
          }
          
          .ebitda-card .card-value {
            font-size: 14px;
            font-weight: bold;
          }
          
          .ebitda-card-consolidado .card-value {
            color: #1e3a8a;
          }
          
          .ebitda-card-sevilla .card-value {
            color: #6b21a8;
          }
          
          .ebitda-card-labranza .card-value {
            color: #047857;
          }
        </style>
      </head>
      <body>
        <div class="ebitda-container">
          <div class="ebitda-title">
            📊 Comparativo EBITDA por Centro
          </div>
          
          <div class="ebitda-chart">
            ${chartImageBase64 ? `
              <img src="${chartImageBase64}" alt="Gráfico Comparativo EBITDA" class="chart-image" />
            ` : '<div style="display: flex; align-items: center; justify-content: center; height: 400px; color: #9ca3af;">Gráfico no disponible</div>'}
          </div>
          
          <div class="ebitda-cards">
            <div class="ebitda-card ebitda-card-consolidado">
              <div class="card-title">EBITDA Promedio<br>Consolidado ${showPercentages ? '(%)' : '(CLP)'}</div>
              <div class="card-value">${formatValue(consolidadoPromedio)}</div>
            </div>
            
            <div class="ebitda-card ebitda-card-sevilla">
              <div class="card-title">EBITDA Promedio<br>Sevilla ${showPercentages ? '(%)' : '(CLP)'}</div>
              <div class="card-value">${formatValue(sevillaPromedio)}</div>
            </div>
            
            <div class="ebitda-card ebitda-card-labranza">
              <div class="card-title">EBITDA Promedio<br>Labranza ${showPercentages ? '(%)' : '(CLP)'}</div>
              <div class="card-value">${formatValue(labranzaPromedio)}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Función para exportar PDF usando Browserless (como MesAnualChartsView)
  const exportPDF = async () => {
    if (!chartRef.current) {
      alert('Gráfico no disponible para exportar');
      return;
    }

    try {
      
      // Capturar el gráfico
      let chartImageData = '';
      if (chartRef.current) {
        try {
          const canvas = chartRef.current.canvas;
          if (canvas) {
            chartImageData = canvas.toDataURL('image/png', 0.95);
          }
        } catch (error) {
          console.error('❌ Error capturando gráfico:', error);
        }
      }

      // Preparar datos para el PDF
      const currentDate = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Calcular promedios
      const consolidadoPromedio = showPercentages 
        ? parseFloat((consolidadoEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitdaPercent.length).toFixed(2))
        : (consolidadoEbitda.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitda.length);
      
      const sevillaPromedio = showPercentages 
        ? parseFloat((sevillaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitdaPercent.length).toFixed(2))
        : (sevillaEbitda.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitda.length);
      
      const labranzaPromedio = showPercentages 
        ? parseFloat((labranzaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitdaPercent.length).toFixed(2))
        : (labranzaEbitda.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitda.length);

      const formatValue = (value: number): string => {
        if (showPercentages) {
          return `${value.toFixed(2)}%`;
        }
        return new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          minimumFractionDigits: 0,
        }).format(value);
      };

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comparativo EBITDA por Centro - ${selectedUserName || 'Usuario'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif;
              background: #ffffff;
              color: #1f2937;
              line-height: 1.4;
              padding: 20px;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 3px solid #22c55e;
              padding-bottom: 10px;
            }
            .header h1 {
              color: #22c55e;
              font-size: 24px;
              margin: 0 0 6px 0;
              font-weight: bold;
            }
            .header p {
              color: #6b7280;
              font-size: 11px;
              margin: 0;
            }
            .main-container {
              display: flex;
              flex-direction: column;
              gap: 15px;
              flex-grow: 1;
              min-height: 0;
            }
            .chart-container {
              background: white;
              border-radius: 12px;
              padding: 15px;
              border: 2px solid #e5e7eb;
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 0 0 62%;
              min-height: 0;
            }
            .chart-image {
              max-width: 100%;
              max-height: 100%;
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 8px;
            }
            .bottom-grid {
              display: grid;
              grid-template-columns: 40% 60%;
              gap: 10px;
              flex: 0 0 auto;
              max-height: 30%;
              min-height: 0;
            }
            .cards-container {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .summary-card {
              background: white;
              border-radius: 8px;
              padding: 8px 10px;
              border: 2px solid #e5e7eb;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .card-consolidado {
              border-left: 6px solid #3b82f6;
              background: #eff6ff;
            }
            .card-sevilla {
              border-left: 6px solid #8b5cf6;
              background: #f3e8ff;
            }
            .card-labranza {
              border-left: 6px solid #10b981;
              background: #ecfdf5;
            }
            .card-title {
              font-size: 9px;
              font-weight: 700;
              margin-bottom: 6px;
              line-height: 1.2;
            }
            .card-consolidado .card-title { color: #1e40af; }
            .card-sevilla .card-title { color: #7c3aed; }
            .card-labranza .card-title { color: #059669; }
            .card-value {
              font-size: 16px;
              font-weight: bold;
            }
            .card-consolidado .card-value { color: #1e3a8a; }
            .card-sevilla .card-value { color: #6b21a8; }
            .card-labranza .card-value { color: #047857; }
            .notes-section {
              background: #ffffff;
              border: 2px solid #d1d5db;
              border-radius: 8px;
              padding: 10px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              height: 100%;
            }
            .notes-title {
              color: #111827;
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 8px;
              flex-shrink: 0;
            }
            .notes-content {
              color: #374151;
              font-size: 9px;
              line-height: 1.5;
              white-space: pre-wrap;
              overflow-y: auto;
              flex-grow: 1;
            }
            .footer {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 9px;
              color: #9ca3af;
              flex-shrink: 0;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <h1>📊 Comparativo EBITDA por Centro</h1>
            <p>Usuario: ${selectedUserName || 'N/A'} | Período: ${selectedPeriod || 'N/A'} | ${currentDate}</p>
          </div>

          <!-- Contenedor Principal Vertical -->
          <div class="main-container">
            <!-- Gráfico (Ancho Completo - Arriba) -->
            ${chartImageData ? `
            <div class="chart-container">
              <img src="${chartImageData}" alt="Gráfico Comparativo EBITDA" class="chart-image" />
            </div>
            ` : ''}

            <!-- Grid Inferior: Cards verticales (40%) + Notas (60%) -->
            <div class="bottom-grid">
              <!-- Columna Izquierda: 3 Cards verticales -->
              <div class="cards-container">
                <div class="summary-card card-consolidado">
                  <div class="card-title">EBITDA Promedio Consolidado ${showPercentages ? '(%)' : '(CLP)'}</div>
                  <div class="card-value">${formatValue(consolidadoPromedio)}</div>
                </div>
                
                <div class="summary-card card-sevilla">
                  <div class="card-title">EBITDA Promedio Sevilla ${showPercentages ? '(%)' : '(CLP)'}</div>
                  <div class="card-value">${formatValue(sevillaPromedio)}</div>
                </div>
                
                <div class="summary-card card-labranza">
                  <div class="card-title">EBITDA Promedio Labranza ${showPercentages ? '(%)' : '(CLP)'}</div>
                  <div class="card-value">${formatValue(labranzaPromedio)}</div>
                </div>
              </div>

              <!-- Columna Derecha: Notas -->
              <div class="notes-section">
                <h3 class="notes-title">Notas del Comparativo</h3>
                <div class="notes-content">${notes.trim() || 'Sin notas'}</div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            BISM Dashboard - Comparativo EBITDA - ${currentDate}
          </div>
        </body>
        </html>
      `;

      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          title: `comparativo-ebitda-${selectedUserName || 'usuario'}-${selectedPeriod || 'periodo'}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      

      // Descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparativo-ebitda-${selectedUserName || 'usuario'}-${selectedPeriod || 'periodo'}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
    }
  };

  return (
    <div ref={contentRef} className="bg-white rounded-xl shadow-lg p-6 overflow-y-auto max-h-screen">
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
          
          <AddToReportButton
            viewName={`Comparativo EBITDA ${showPercentages ? '(%)' : '(CLP)'}`}
            uniqueKey={`ComparativoEbitda-${showPercentages ? 'percentage' : 'clp'}-${selectedPeriod || 'Sin período'}`}
            contentRef={contentRef as React.RefObject<HTMLElement>}
            period={selectedPeriod || 'Sin período'}
            captureMode="html"
            htmlGenerator={() => generateComparativoEbitdaHTML()}
          />
          
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

      {/* Summary Cards + Notes - Grid Layout */}
      <div className="max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6 mb-6 items-start">
          {/* Left Column: 3 Cards Vertical */}
          <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
            <div className="text-blue-700 text-sm font-semibold">
              EBITDA Promedio Consolidado {showPercentages ? '(%)' : '(CLP)'}
            </div>
            <div className="text-blue-900 text-lg font-bold mt-1">
              {showPercentages ? (
                `${(consolidadoEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitdaPercent.length).toFixed(2)}%`
              ) : (
                `$${(consolidadoEbitda.reduce((acc: number, val: number) => acc + val, 0) / consolidadoEbitda.length).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              )}
            </div>
          </div>
          
          <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
            <div className="text-purple-700 text-sm font-semibold">
              EBITDA Promedio Sevilla {showPercentages ? '(%)' : '(CLP)'}
            </div>
            <div className="text-purple-900 text-lg font-bold mt-1">
              {showPercentages ? (
                `${(sevillaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitdaPercent.length).toFixed(2)}%`
              ) : (
                `$${(sevillaEbitda.reduce((acc: number, val: number) => acc + val, 0) / sevillaEbitda.length).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              )}
            </div>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
            <div className="text-green-700 text-sm font-semibold">
              EBITDA Promedio Labranza {showPercentages ? '(%)' : '(CLP)'}
            </div>
            <div className="text-green-900 text-lg font-bold mt-1">
              {showPercentages ? (
                `${(labranzaEbitdaPercent.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitdaPercent.length).toFixed(2)}%`
              ) : (
                `$${(labranzaEbitda.reduce((acc: number, val: number) => acc + val, 0) / labranzaEbitda.length).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              )}
            </div>
          </div>
        </div>

          {/* Right Column: Notes Section */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4 flex flex-col h-full">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              📝 Notas del comparativo:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega tus observaciones sobre la evolución comparativa del EBITDA entre centros..."
              className="flex-grow w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 resize-none bg-gray-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}