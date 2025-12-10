'use client';

import { useState, useMemo, useRef } from 'react';
import type { ExcelRow, EERRData } from '@/types';
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
import AddToReportButton from './AddToReportButton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MesAnualChartsViewProps {
  consolidadoData: ExcelRow[];
  sucursalesData: Array<{
    name: string;  // Nombre de la sucursal ("Sevilla", "Pan de Azúcar", etc.)
    data: EERRData | null;
  }>;
  periodLabel: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Función para convertir EERRData a ExcelRow[] - reutilizada del análisis trimestral
const convertEERRToExcelRows = (eerrData: EERRData): ExcelRow[] => {
  const rows: ExcelRow[] = [];
  
  eerrData.categories.forEach(category => {
    category.rows.forEach(row => {
      rows.push(row);
    });
    
    // Agregar fila de total si existe
    if (category.total) {
      rows.push(category.total);
    }
  });
  
  return rows;
};

// Función para obtener valor con ambos formatos de columna (normal y mayúsculas)
const getMonthValue = (row: ExcelRow, month: string): number => {
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

  // Intentar ambos formatos: "Enero Monto" y "ENERO Monto"
  const columnName1 = `${month} Monto`;           // Formato normal
  const columnName2 = `${month.toUpperCase()} Monto`;  // Formato mayúsculas
  
  let rawValue = row[columnName1];
  
  // Si no encuentra con formato normal, intenta con mayúsculas
  if (rawValue === undefined) {
    rawValue = row[columnName2];
  }
  
  return parseValue(rawValue);
};

// Funciones de formato compartidas (movidas fuera del componente para evitar duplicación)
const formatValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  }
  return String(value);
};

const formatPercentage = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    return `${value.toFixed(2)}%`;
  }
  return String(value);
};

export default function MesAnualChartsView({ 
  consolidadoData, 
  sucursalesData,
  periodLabel 
}: MesAnualChartsViewProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>('consolidado');
  const [selectedMonth, setSelectedMonth] = useState<string>('Febrero');
  const [selectedItemForChart, setSelectedItemForChart] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  // Helper para crear slug
  const createSlug = (text: string) => text.toLowerCase().replace(/\s+/g, '_');

  // Función para obtener datos activos según la unidad seleccionada
  const getActiveData = (): ExcelRow[] => {
    if (selectedUnit === 'consolidado') {
      return consolidadoData || [];
    }
    
    // Buscar datos de la sucursal seleccionada
    const sucursal = sucursalesData.find(s => createSlug(s.name) === selectedUnit);
    return sucursal?.data ? convertEERRToExcelRows(sucursal.data) : [];
  };

  const activeData = getActiveData();

  // Preparar datos para la tabla - TODOS los ítems del mes seleccionado
  const tableData = useMemo(() => {
    const selectedMonthIndex = MONTHS.indexOf(selectedMonth);
    
    // Primero encontrar y calcular el acumulado de Ventas Netas (referencia base)
    const ventasNetasRow = activeData.find((row: ExcelRow) => 
      row.Item?.toLowerCase().includes('ventas netas') || 
      row.Item?.toLowerCase().includes('ventas afectas') ||
      row.Item === 'Ventas Netas' ||
      row.Item?.toLowerCase().includes('ventas')
    );
    
    let ventasNetasAcumulado = 0;
    if (ventasNetasRow) {
      for (let i = 0; i <= selectedMonthIndex; i++) {
        const monthName = MONTHS[i];
        const monthValue = getMonthValue(ventasNetasRow, monthName);
        ventasNetasAcumulado += monthValue;
      }
    }
    
    return activeData.map((row: ExcelRow) => {
      // Calcular acumulado hasta el mes seleccionado para cada ítem
      let acumuladoValue = 0;
      for (let i = 0; i <= selectedMonthIndex; i++) {
        const monthName = MONTHS[i];
        const monthValue = getMonthValue(row, monthName);
        acumuladoValue += monthValue;
      }

      const mesValue = getMonthValue(row, selectedMonth);
      
      // Calcular porcentaje basado en Ventas Netas como referencia
      let porcentajeValue = 0;
      if (row.Item?.toLowerCase().includes('ventas netas') || 
          row.Item?.toLowerCase().includes('ventas afectas') ||
          row.Item === 'Ventas Netas' ||
          row.Item?.toLowerCase().includes('ventas')) {
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
  }, [activeData, selectedMonth]);

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

    setIsGeneratingPdf(true);

    try {
      
      // Capturar el gráfico
      let chartImageData = '';
      if (chartRef.current) {
        try {
          const canvas = chartRef.current.canvas;
          if (canvas) {
            chartImageData = canvas.toDataURL('image/png', 0.95);
          } else {
            console.warn('⚠️ Canvas del gráfico no encontrado');
          }
        } catch (error) {
          console.error('❌ Error capturando gráfico:', error);
        }
      }

      // Generar HTML con tabla y datos para PDF
      const currentDate = new Date().toLocaleDateString('es-ES', { 
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
              font-family: 'Arial', sans-serif;
              background: #ffffff;
              color: #1f2937;
              line-height: 1.4;
              padding: 0;
              margin: 0;
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            
            /* Header compacto en la misma página */
            .header {
              text-align: center;
              margin: 0 0 12px 0;
              padding: 8px 12px 10px 12px;
              border-bottom: 3px solid #3b82f6;
            }
            .header h1 {
              color: #1f2937;
              font-size: 20px;
              margin: 0 0 5px 0;
              font-weight: bold;
              letter-spacing: -0.3px;
            }
            .header .business-unit {
              color: #3b82f6;
              padding: 0;
              font-size: 12px;
              font-weight: 600;
              display: block;
              margin: 3px 0 5px 0;
              text-transform: uppercase;
              letter-spacing: 0.8px;
            }
            .header p {
              color: #6b7280;
              font-size: 9px;
              margin: 0;
              font-weight: normal;
            }
            
            /* Contenedor para el contenido */
            .main-content {
              padding: 15px;
            }
            .chart-container {
              text-align: center;
              margin: 0 0 15px 0;
              background: white;
              border-radius: 12px;
              padding: 15px;
              border: 1px solid #e5e7eb;
              page-break-before: always;
              page-break-inside: avoid;
              break-inside: avoid;
              max-height: 65vh;
            }
            .chart-image {
              max-width: 100%;
              max-height: 60vh;
              height: auto;
              width: auto;
              border-radius: 8px;
              object-fit: contain;
            }
            .table-container {
              background: white;
              border-radius: 12px;
              margin-bottom: 15px;
              margin-top: 0;
              border: 2px solid #e5e7eb;
              overflow: hidden;
              page-break-inside: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            thead {
              display: table-header-group;
            }
            tbody {
              display: table-row-group;
            }
            tbody tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background: #1e40af;
              color: white;
              padding: 12px;
              text-align: center;
              font-weight: bold;
              font-size: 12px;
            }
            td {
              padding: 10px;
              text-align: center;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            /* Estilos compactos para tablas medianas (26-40 filas) */
            .table-medium th {
              padding: 10px;
              font-size: 11px;
            }
            .table-medium td {
              padding: 8px;
              font-size: 10px;
            }
            /* Estilos compactos para tablas grandes (>40 filas) */
            .table-large th {
              padding: 8px;
              font-size: 10px;
            }
            .table-large td {
              padding: 6px;
              font-size: 9.5px;
              line-height: 1.4;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            tr:hover {
              background: #e0f2fe;
            }
            .item-name {
              text-align: left !important;
              font-weight: 600;
              color: #374151;
            }
            .month-value {
              color: #3b82f6;
              font-weight: 600;
            }
            .annual-value {
              color: #059669;
              font-weight: 600;
            }
            .percentage {
              color: #dc2626;
              font-weight: 600;
            }
            .average-value {
              color: #7c3aed;
              font-weight: 600;
            }
            .notes-section {
              background: #ffffff;
              border: 2px solid #cdcac5d8;
              border-radius: 12px;
              padding: 15px;
              margin-top: 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .footer {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #9ca3af;
            }
            @media print {
              body { padding: 0; }
              .main-content { padding: 15px; }
              .table-container { 
                page-break-inside: auto;
              }
              thead { 
                display: table-header-group;
              }
              tbody tr { 
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="main-content">
            <!-- Header + Tabla (se divide naturalmente si es necesario) -->
            <div class="header">
              <h1>📊 Comparación ${selectedMonth} vs Anual</h1>
              <div class="business-unit">
                ${selectedUnit === 'consolidado' ? '🏢 Consolidado' : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}
              </div>
              <p>Período: ${periodLabel} | Generado: ${currentDate}</p>
            </div>
            
            <div class="table-container">
            <table class="${
              tableData.length <= 25 ? '' : 
              tableData.length <= 40 ? 'table-medium' : 
              'table-large'
            }">
              <thead>
                <tr>
                  <th>ÍTEM</th>
                  <th>${selectedMonth.toUpperCase()}</th>
                  <th>ACUMULADO 2024</th>
                  <th>%</th>
                  <th>PROMEDIO ANUAL</th>
                </tr>
              </thead>
              <tbody>
                ${tableData.map(row => `
                  <tr>
                    <td class="item-name">${row.item}</td>
                    <td class="month-value">${formatValue(row.mes)}</td>
                    <td class="annual-value">${formatValue(row.acumulado)}</td>
                    <td class="percentage">${formatPercentage(row.porcentaje)}</td>
                    <td class="average-value">${formatValue(row.promedio)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            </div>

            <!-- Gráfico + Notas (nueva página automática) -->
            ${chartImageData ? `
            <div class="chart-container">
              <img src="${chartImageData}" alt="Gráfico de comparación" class="chart-image" />
            </div>
            ` : ''}

            ${notes && notes.trim() ? `
            <div class="notes-section">
              <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px;">Notas y Observaciones</h3>
              <div style="color: #000011; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${notes}</div>
            </div>
            ` : ''}

            <div class="footer">
              <span>BISM Dashboard - Documento generado automáticamente</span>
              <span>Comparación ${selectedMonth} vs Datos Anuales ${periodLabel}</span>
            </div>
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
        let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.error('❌ Error del API:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          if (errorData.useClientFallback) {
            throw new Error('Browserless no disponible: ' + errorMessage);
          }
        } catch {
          console.error('❌ No se pudo parsear la respuesta de error');
        }
        
        throw new Error(errorMessage);
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

      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Función para generar HTML específico para el reporte multi-gráfico
  const generateComparisonReportHTML = async (): Promise<string> => {
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

    // Filtrar tabla para mostrar solo el ítem del gráfico actual
    const filteredTableData = tableData.filter(row => row.item === selectedItemForChart);

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comparación ${selectedMonth} vs Anual</title>
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
          
          .mes-anual-container {
            display: grid;
            grid-template-columns: 68% 32%;
            grid-template-rows: auto 1fr auto;
            gap: 10px;
            height: 100%;
            max-height: 500px;
            padding: 5px;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .mes-anual-title {
            grid-column: 1 / 3;
            grid-row: 1;
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 5px;
            margin-bottom: 5px;
            text-align: center;
          }
          
          .mes-anual-chart {
            grid-column: 1;
            grid-row: 2 / 4;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #fafafa;
          }
          
          .mes-anual-chart .chart-image {
            max-width: 100%;
            max-height: 380px;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 4px;
          }
          
          .mes-anual-table {
            grid-column: 2;
            grid-row: 2;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px;
            overflow: hidden;
          }
          
          .mes-anual-table table {
            width: 100%;
            font-size: 10px;
            border-collapse: collapse;
          }
          
          .mes-anual-table thead {
            display: none;
          }
          
          .mes-anual-table tbody tr {
            display: flex;
            flex-direction: column;
            padding: 8px;
            background: #f9fafb;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
          }
          
          .mes-anual-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            font-size: 10px;
            border: none;
          }
          
          .mes-anual-table td:not(:last-child) {
            border-bottom: 1px solid #e5e7eb;
          }
          
          .mes-anual-table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #6b7280;
            margin-right: 8px;
          }
          
          .mes-anual-table td:first-child::before {
            content: 'ÍTEM: ';
          }
          
          .mes-anual-table .item-name {
            font-weight: 700;
            color: #1f2937;
            font-size: 11px;
          }
          
          .mes-anual-table .month-value {
            color: #3b82f6;
            font-weight: 600;
          }
          
          .mes-anual-table .annual-value {
            color: #06b6d4;
            font-weight: 600;
          }
          
          .mes-anual-table .percentage {
            color: #a855f7;
            font-weight: 600;
          }
          
          .mes-anual-table .average-value {
            color: #22c55e;
            font-weight: 600;
          }
          
          .mes-anual-notes {
            grid-column: 2;
            grid-row: 3;
            background: #ffffff;
            border: 1px solid #6b7280;
            border-radius: 8px;
            padding: 12px;
            text-align: left;
            max-height: 150px;
            overflow: hidden;
          }
          
          .mes-anual-notes-title {
            color: #000000;
            font-weight: bold;
            margin-bottom: 6px;
            font-size: 11px;
            text-align: left;
          }
          
          .mes-anual-notes-content {
            color: #000000;
            line-height: 1.4;
            font-size: 9px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="mes-anual-container">
          <div class="mes-anual-title">
            📊 Comparación ${selectedMonth} vs Anual - ${selectedUnit === 'consolidado' ? 'Consolidado' : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}
          </div>
          
          <div class="mes-anual-chart">
            ${chartImageBase64 ? `
              <img src="${chartImageBase64}" alt="Gráfico de comparación" class="chart-image" />
            ` : '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">Gráfico no disponible</div>'}
          </div>
          
          <div class="mes-anual-table">
            <table>
              <thead>
                <tr>
                  <th>ÍTEM</th>
                  <th>${selectedMonth.toUpperCase()}</th>
                  <th>ACUMULADO 2024</th>
                  <th>%</th>
                  <th>PROMEDIO ANUAL</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTableData.map(row => `
                  <tr>
                    <td class="item-name">${row.item}</td>
                    <td class="month-value" data-label="${selectedMonth.toUpperCase()}">${formatValue(row.mes)}</td>
                    <td class="annual-value" data-label="ACUMULADO 2024">${formatValue(row.acumulado)}</td>
                    <td class="percentage" data-label="%">${formatPercentage(row.porcentaje)}</td>
                    <td class="average-value" data-label="PROMEDIO ANUAL">${formatValue(row.promedio)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="mes-anual-notes">
            <div class="mes-anual-notes-title">Análisis del gráfico:</div>
            <div class="mes-anual-notes-content">${notes.trim() ? notes.replace(/\n/g, '<br>') : 'Sin notas adicionales.'}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (!activeData || activeData.length === 0) {
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
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                  {selectedUnit === 'consolidado' 
                    ? '📊 Datos Consolidado' 
                    : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}
                </span>
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex items-center gap-3">
            <AddToReportButton
              viewName={`Comparación ${selectedMonth} vs Anual - ${selectedUnit === 'consolidado' ? 'Consolidado' : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}`}
              uniqueKey={`MesAnualComparison-${selectedUnit}-${selectedMonth}-${selectedItemForChart}-${periodLabel}`}
              contentRef={contentRef as React.RefObject<HTMLElement>}
              period={periodLabel}
              disabled={tableData.length === 0}
              captureMode="html"
              htmlGenerator={() => generateComparisonReportHTML()}
            />
            
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
      </div>

      {/* Selector de Unidad de Negocio - Din\u00e1mico */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🏢 Unidad de Negocio
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Bot\u00f3n Consolidado */}
          <button
            onClick={() => setSelectedUnit('consolidado')}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 ${
              selectedUnit === 'consolidado'
                ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
            }`}
          >
            📊 Consolidado
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {consolidadoData?.length || 0}
            </span>
          </button>
          
          {/* Botones de sucursales din\u00e1micos */}
          {sucursalesData.map((sucursal, index) => {
            const sucursalSlug = createSlug(sucursal.name);
            const isActive = selectedUnit === sucursalSlug;
            const hasData = sucursal.data !== null;
            const rowCount = hasData && sucursal.data ? convertEERRToExcelRows(sucursal.data).length : 0;
            
            // Colores din\u00e1micos por sucursal (mismo orden que leyenda)
            const colors = [
              { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', hover: 'hover:bg-green-100 hover:border-green-300', badge: 'bg-green-100 text-green-800' },
              { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', hover: 'hover:bg-orange-100 hover:border-orange-300', badge: 'bg-orange-100 text-orange-800' },
              { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', hover: 'hover:bg-purple-100 hover:border-purple-300', badge: 'bg-purple-100 text-purple-800' },
              { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', hover: 'hover:bg-pink-100 hover:border-pink-300', badge: 'bg-pink-100 text-pink-800' }
            ];
            const color = colors[index % colors.length];
            
            return (
              <button
                key={sucursal.name}
                onClick={() => setSelectedUnit(sucursalSlug)}
                disabled={!hasData}
                className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 ${
                  isActive
                    ? `${color.bg} text-white ${color.bg.replace('bg-', 'border-')} shadow-lg`
                    : hasData 
                      ? `${color.light} ${color.text} ${color.border} ${color.hover}`
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                {sucursal.name}
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                  hasData ? color.badge : 'bg-gray-200 text-gray-500'
                }`}>
                  {rowCount}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Unidad activa:</span> 
            <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {selectedUnit === 'consolidado' 
                ? '📊 Consolidado' 
                : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}
            </span>
            <span className="ml-3 text-gray-600">
              • {activeData.length} ítems disponibles
            </span>
          </p>
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
              <Bar ref={chartRef} data={chartData} options={chartOptions} />
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