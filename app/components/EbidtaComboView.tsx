"use client";

import { useState, useRef, useEffect } from "react";
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
} from "chart.js";
import { Chart } from "react-chartjs-2";
import AddToReportButton from './AddToReportButton';

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
    html2canvas: (
      element: HTMLElement,
      options?: { backgroundColor?: string }
    ) => Promise<HTMLCanvasElement>;
  }
}

interface ExcelRow {
  Item: string;
  [key: string]: string | number | undefined;
}

interface EERRData {
  sheetName: string;
  months: string[];
  categories: EERRCategory[];
}

interface EERRCategory {
  name: string;
  rows: EERRRow[];
  total?: EERRRow;
}

interface EERRRow {
  Item: string;
  [key: string]: string | number | undefined;
}

// Función helper fuera del componente para evitar recreaciones
const convertEERRToExcelRows = (eerrData?: EERRData): ExcelRow[] => {
  if (!eerrData || !eerrData.categories) return [];
  
  const rows: ExcelRow[] = [];
  
  eerrData.categories.forEach(category => {
    category.rows.forEach(row => {
      const convertedRow: ExcelRow = { Item: row.Item };
      
      Object.keys(row).forEach(key => {
        if (key !== 'Item') {
          convertedRow[key] = row[key];
        }
      });
      
      rows.push(convertedRow);
    });
    
    if (category.total) {
      const convertedRow: ExcelRow = { Item: category.total.Item };
      
      Object.keys(category.total).forEach(key => {
        if (key !== 'Item') {
          convertedRow[key] = category.total![key];
        }
      });
      
      rows.push(convertedRow);
    }
  });
  
  return rows;
};

interface EbidtaComboViewProps {
  consolidadoData?: ExcelRow[];
  sucursalesData: Array<{
    name: string;
    data: EERRData | null;
  }>;
  selectedUserName?: string;
  selectedPeriod?: string;
}

export default function EbidtaComboView({
  consolidadoData,
  sucursalesData,
  selectedUserName,
  selectedPeriod,
}: EbidtaComboViewProps) {
  const chartRef = useRef<ChartJS>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('consolidado');

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Cargando gráfico combo...</span>
        </div>
      </div>
    );
  }

  // Función para parsear valores monetarios mejorada
  const parseValue = (value: string | number | undefined): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      // Casos especiales
      if (value === "#DIV/0!" || value === "" || value === "$0") return 0;

      // Remover símbolo $ y espacios
      let cleaned = value.replace(/\$|\s/g, "");

      // Si tiene comas como separadores de miles (ej: 2,365,037)
      // Las comas están separando miles, no decimales
      if (cleaned.includes(",")) {
        // Remover todas las comas (separadores de miles)
        cleaned = cleaned.replace(/,/g, "");
      }

      // Parsear el número final
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Obtener datos para el gráfico combo
  const getComboData = () => {
    const data = getActiveData();
    
    
    // Buscar filas con patrones más amplios
    const ebitdaRow = data.find(
      (row: ExcelRow) => {
        const item = row.Item?.toLowerCase() || '';
        return item.includes("ebitda") || 
               item.includes("ebidta") ||
               item.includes("utilidad operacional") ||
               item.includes("resultado operacional");
      }
    );

    const ventasNetasRow = data.find(
      (row: ExcelRow) => {
        const item = row.Item?.toLowerCase() || '';
        return item.includes("ventas netas") ||
               item.includes("ventas afectas") ||
               item.includes("ingresos") ||
               item.includes("revenue") ||
               item.includes("ventas") ||
               item === "Ventas Netas" ||
               item === "Ingresos por Ventas";
      }
    );

    // Nombres de meses como están en los datos reales
    const MONTHS = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const SHORT_MONTHS = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];

    const processedData = SHORT_MONTHS.map((shortMonth, index) => {
      const fullMonth = MONTHS[index];
      
      // Buscar tanto formato "Enero Monto" como "ENERO Monto"  
      const ebitdaRaw = ebitdaRow ? 
        (ebitdaRow[`${fullMonth} Monto`] || ebitdaRow[`${fullMonth.toUpperCase()} Monto`]) : 0;
      const ventasRaw = ventasNetasRow ?
        (ventasNetasRow[`${fullMonth} Monto`] || ventasNetasRow[`${fullMonth.toUpperCase()} Monto`]) : 0;

      const ebitda = parseValue(ebitdaRaw);
      const ventasNetas = parseValue(ventasRaw);

      // Calcular margen EBITDA (%)
      const margenEbitda = ventasNetas !== 0 ? (ebitda / ventasNetas) * 100 : 0;

      return {
        month: shortMonth,
        ebitda,
        ventasNetas,
        margenEbitda,
      };
    });
    return processedData;
  };

  const comboData = getComboData();

  // Configuración del gráfico combo
  const chartData = {
    labels: comboData.map((d) => d.month),
    datasets: [
      {
        type: "bar" as const,
        label: "EBITDA Mensual",
        data: comboData.map((d) => d.ebitda),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        yAxisID: "y",
      },
      {
        type: "line" as const,
        label: "% Margen EBITDA",
        data: comboData.map((d) => d.margenEbitda),
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 3,
        fill: false,
        tension: 0.3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: "rgba(16, 185, 129, 1)",
        pointBorderColor: "white",
        pointBorderWidth: 2,
        yAxisID: "y1",
      },
    ],
  };

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "bold",
          },
        },
      },
      title: {
        display: true,
        text: `Análisis Combo EBITDA (${selectedUnit === 'consolidado' ? 'Consolidado' : selectedUnit === 'sevilla' ? 'Sevilla' : 'Labranza'}) - ${selectedUserName || "Usuario"} - ${
          selectedPeriod || "Período"
        }`,
        font: {
          size: 18,
          weight: "bold",
        },
        color: "#1f2937",
        padding: 20,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y || 0;
            if (context.dataset.label?.includes("%")) {
              return `${context.dataset.label}: ${value.toFixed(1)}%`;
            } else {
              const formatter = new Intl.NumberFormat("es-CL", {
                style: "currency",
                currency: "CLP",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              });
              return `${context.dataset.label}: ${formatter.format(value)}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 11,
            weight: "bold",
          },
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "EBITDA (CLP)",
          color: "#374151",
          font: {
            size: 12,
            weight: "bold",
          },
        },
        grid: {
          color: "rgba(59, 130, 246, 0.1)",
        },
        ticks: {
          color: "#3b82f6",
          callback: function (value) {
            const formatter = new Intl.NumberFormat("es-CL", {
              notation: "compact",
              compactDisplay: "short",
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            });
            return formatter.format(value as number);
          },
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: "Margen EBITDA (%)",
          color: "#374151",
          font: {
            size: 12,
            weight: "bold",
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#10b981",
          callback: function (value) {
            return `${(value as number).toFixed(1)}%`;
          },
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
  };

  // Función para generar HTML del reporte (sin notas, 4 cards horizontales)
  const generateEbitdaComboHTML = async (): Promise<string> => {
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

    // Calcular métricas
    let ebitdaPromedio = 0;
    let margenPromedio = 0;
    let ebitdaMaximo = 0;
    let margenMaximo = 0;

    if (comboData.length > 0) {
      ebitdaPromedio = comboData.reduce((acc, d) => acc + d.ebitda, 0) / comboData.length;
      margenPromedio = comboData.reduce((acc, d) => acc + d.margenEbitda, 0) / comboData.length;
      ebitdaMaximo = Math.max(...comboData.map((d) => d.ebitda));
      margenMaximo = Math.max(...comboData.map((d) => d.margenEbitda));
    }

    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(value);
    };

    const unitName = selectedUnit === 'consolidado' ? 'Consolidado' : selectedUnit === 'sevilla' ? 'Sevilla' : 'Labranza';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Análisis Combo EBITDA</title>
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
          
          .ebitda-combo-container {
            display: grid;
            grid-template-rows: auto auto 65px;
            gap: 2px;
            padding: 2px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .ebitda-combo-title {
            font-size: 12px;
            font-weight: bold;
            color: #1f2937;
            border-bottom: 1px solid #3b82f6;
            padding-bottom: 1px;
            margin-bottom: 1px;
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .ebitda-combo-chart {
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 0;
            display: flex;
            align-items: stretch;
            justify-content: center;
            overflow: hidden;
            height: 420px;
          }
          
          .ebitda-combo-chart .chart-image {
            width: 100%;
            height: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 4px;
          }
          
          .ebitda-combo-cards {
            display: grid;
            grid-template-columns: 2fr 1fr 2fr 1fr;
            gap: 8px;
          }
          
          .ebitda-combo-card {
            background: white;
            border-radius: 6px;
            padding: 10px 12px;
            border: 2px solid #e5e7eb;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          
          .card-blue {
            border-left: 5px solid #3b82f6;
            background: #eff6ff;
          }
          
          .card-green {
            border-left: 5px solid #10b981;
            background: #ecfdf5;
          }
          
          .card-amber {
            border-left: 5px solid #f59e0b;
            background: #fef3c7;
          }
          
          .card-purple {
            border-left: 5px solid #8b5cf6;
            background: #f3e8ff;
          }
          
          .ebitda-combo-card .card-title {
            font-size: 9px;
            font-weight: 700;
            margin-bottom: 6px;
            line-height: 1.2;
          }
          
          .card-blue .card-title {
            color: #1e40af;
          }
          
          .card-green .card-title {
            color: #059669;
          }
          
          .card-amber .card-title {
            color: #d97706;
          }
          
          .card-purple .card-title {
            color: #7c3aed;
          }
          
          .ebitda-combo-card .card-value {
            font-size: 16px;
            font-weight: bold;
          }
          
          .card-blue .card-value {
            color: #1e3a8a;
          }
          
          .card-green .card-value {
            color: #047857;
          }
          
          .card-amber .card-value {
            color: #b45309;
          }
          
          .card-purple .card-value {
            color: #6b21a8;
          }
        </style>
      </head>
      <body>
        <div class="ebitda-combo-container">
          <div class="ebitda-combo-title">
            📊📈 Análisis Combo EBITDA - ${unitName}
          </div>
          
          <div class="ebitda-combo-chart">
            ${chartImageBase64 ? `
              <img src="${chartImageBase64}" alt="Gráfico Combo EBITDA" class="chart-image" />
            ` : '<div style="display: flex; align-items: center; justify-content: center; height: 400px; color: #9ca3af;">Gráfico no disponible</div>'}
          </div>
          
          <div class="ebitda-combo-cards">
            <div class="ebitda-combo-card card-blue">
              <div class="card-title">EBITDA Promedio</div>
              <div class="card-value">${formatCurrency(ebitdaPromedio)}</div>
            </div>
            
            <div class="ebitda-combo-card card-green">
              <div class="card-title">Margen Promedio</div>
              <div class="card-value">${margenPromedio.toFixed(1)}%</div>
            </div>
            
            <div class="ebitda-combo-card card-amber">
              <div class="card-title">EBITDA Máximo</div>
              <div class="card-value">${formatCurrency(ebitdaMaximo)}</div>
            </div>
            
            <div class="ebitda-combo-card card-purple">
              <div class="card-title">Margen Máximo</div>
              <div class="card-value">${margenMaximo.toFixed(1)}%</div>
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
      alert("Gráfico no disponible para exportar");
      return;
    }

    try {
      // Capturar el gráfico
      let chartImageData = "";
      if (chartRef.current) {
        try {
          const canvas = chartRef.current.canvas;
          if (canvas) {
            chartImageData = canvas.toDataURL("image/png", 0.95);
          }
        } catch (error) {
          console.error("❌ Error capturando gráfico:", error);
        }
      }

      // Preparar datos para el PDF
      const currentDate = new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Calcular métricas si hay datos
      let ebitdaPromedio = 0;
      let margenPromedio = 0;
      let ebitdaMaximo = 0;
      let margenMaximo = 0;

      if (comboData.length > 0) {
        ebitdaPromedio =
          comboData.reduce((acc, d) => acc + d.ebitda, 0) / comboData.length;
        margenPromedio =
          comboData.reduce((acc, d) => acc + d.margenEbitda, 0) /
          comboData.length;
        ebitdaMaximo = Math.max(...comboData.map((d) => d.ebitda));
        margenMaximo = Math.max(...comboData.map((d) => d.margenEbitda));
      }

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Análisis Combo EBITDA - ${selectedUserName || "Usuario"}</title>
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
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 10px;
            }
            .header h1 {
              color: #3b82f6;
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
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              flex: 1;
              min-height: 0;
            }
            .cards-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: 1fr 1fr;
              gap: 10px;
            }
            .summary-card {
              background: white;
              border-radius: 10px;
              padding: 12px;
              border: 2px solid #e5e7eb;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .card-ebitda-prom {
              border-left: 8px solid #3b82f6;
              background: #eff6ff;
            }
            .card-margen-prom {
              border-left: 8px solid #10b981;
              background: #ecfdf5;
            }
            .card-ebitda-max {
              border-left: 8px solid #f59e0b;
              background: #fffbeb;
            }
            .card-margen-max {
              border-left: 8px solid #8b5cf6;
              background: #f3e8ff;
            }
            .card-title {
              font-size: 10px;
              font-weight: 700;
              margin-bottom: 8px;
              line-height: 1.3;
            }
            .card-ebitda-prom .card-title { color: #1e40af; }
            .card-margen-prom .card-title { color: #059669; }
            .card-ebitda-max .card-title { color: #d97706; }
            .card-margen-max .card-title { color: #7c3aed; }
            .card-value {
              font-size: 16px;
              font-weight: bold;
            }
            .card-ebitda-prom .card-value { color: #1e3a8a; }
            .card-margen-prom .card-value { color: #047857; }
            .card-ebitda-max .card-value { color: #92400e; }
            .card-margen-max .card-value { color: #6b21a8; }
            .notes-section {
              background: #ffffff;
              border: 2px solid #d1d5db;
              border-radius: 10px;
              padding: 15px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              height: 100%;
            }
            .notes-title {
              color: #111827;
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 10px;
              flex-shrink: 0;
            }
            .notes-content {
              color: #374151;
              font-size: 11px;
              line-height: 1.6;
              white-space: pre-wrap;
              overflow-y: auto;
              flex-grow: 1;
            }
            .footer {
              margin-top: 12px;
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
            <h1>📊 Análisis Combo EBITDA (${selectedUnit === 'consolidado' ? 'Consolidado' : selectedUnit === 'sevilla' ? 'Sevilla' : 'Labranza'})</h1>
            <p>Usuario: ${selectedUserName || 'N/A'} | Período: ${selectedPeriod || 'N/A'} | ${currentDate}</p>
          </div>

          <!-- Contenedor Principal Vertical -->
          <div class="main-container">
            <!-- Gráfico (Ancho Completo - Arriba) -->
            ${chartImageData ? `
            <div class="chart-container">
              <img src="${chartImageData}" alt="Gráfico Análisis Combo EBITDA" class="chart-image" />
            </div>
            ` : ''}

            <!-- Grid Inferior: Cards (50%) + Notas (50%) -->
            <div class="bottom-grid">
              <!-- Columna Izquierda: Grid 2x2 de Cards -->
              <div class="cards-container">
                <div class="summary-card card-ebitda-prom">
                  <div class="card-title">EBITDA Promedio</div>
                  <div class="card-value">$${ebitdaPromedio.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
                
                <div class="summary-card card-margen-prom">
                  <div class="card-title">Margen Promedio</div>
                  <div class="card-value">${margenPromedio.toFixed(1)}%</div>
                </div>
                
                <div class="summary-card card-ebitda-max">
                  <div class="card-title">EBITDA Máximo</div>
                  <div class="card-value">$${ebitdaMaximo.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
                
                <div class="summary-card card-margen-max">
                  <div class="card-title">Margen Máximo</div>
                  <div class="card-value">${margenMaximo.toFixed(1)}%</div>
                </div>
              </div>

              <!-- Columna Derecha: Notas -->
              <div class="notes-section">
                <h3 class="notes-title">Notas del Análisis</h3>
                <div class="notes-content">${notes.trim() || 'Sin notas'}</div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            BISM Dashboard - Análisis Combo EBITDA - ${currentDate}
          </div>
        </body>
        </html>
      `;


      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html,
          title: `combo-ebitda-${selectedUserName || "usuario"}-${
            selectedPeriod || "periodo"
          }`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const blob = await response.blob();

      // Descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `combo-ebitda-${selectedUserName || "usuario"}-${
        selectedPeriod || "periodo"
      }-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("❌ Error al generar PDF:", error);
      alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <div ref={contentRef} className="bg-white rounded-xl shadow-lg p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            📊📈 Análisis Combo EBITDA
          </h2>
          <p className="text-gray-600">
            EBITDA mensual (barras) + % margen EBITDA (línea) - Doble
            perspectiva del negocio
          </p>
          <div className="mt-2 text-sm text-gray-500">
            <span className="font-medium">Usuario:</span>{" "}
            {selectedUserName || "No seleccionado"} |
            <span className="font-medium ml-2">Período:</span>{" "}
            {selectedPeriod || "No seleccionado"}
          </div>
        </div>

        <div className="flex gap-2">
          <AddToReportButton
            viewName={`Análisis Combo EBITDA - ${selectedUnit === 'consolidado' ? 'Consolidado' : selectedUnit === 'sevilla' ? 'Sevilla' : 'Labranza'}`}
            uniqueKey={`EbitdaCombo-${selectedUnit}-${selectedPeriod || 'Sin período'}`}
            contentRef={contentRef as React.RefObject<HTMLElement>}
            period={selectedPeriod || 'Sin período'}
            captureMode="html"
            htmlGenerator={() => generateEbitdaComboHTML()}
          />
          
          <button
            onClick={exportPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Selector de Unidad de Negocio */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">
            🏢 Unidad de Negocio:
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedUnit('consolidado')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedUnit === 'consolidado'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-50'
              }`}
            >
              📊 Consolidado
            </button>
            <button
              onClick={() => setSelectedUnit('sevilla')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedUnit === 'sevilla'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-green-50'
              }`}
            >
              🏭 Sevilla
            </button>
            <button
              onClick={() => setSelectedUnit('labranza')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedUnit === 'labranza'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50'
              }`}
            >
              🌾 Labranza
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="w-full h-[500px] mb-6 overflow-visible">
        <Chart type="bar" ref={chartRef} data={chartData} options={options} />
      </div>

      {/* Summary Cards + Notes Section - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column: 4 Cards in 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {comboData.length > 0 && (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="text-blue-700 text-xs font-semibold">
                  EBITDA Promedio
                </div>
                <div className="text-blue-900 text-lg font-bold mt-1">
                  $
                  {(
                    comboData.reduce((acc, d) => acc + d.ebitda, 0) /
                    comboData.length
                  ).toLocaleString("es-CL", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <div className="text-green-700 text-xs font-semibold">
                  Margen Promedio
                </div>
                <div className="text-green-900 text-lg font-bold mt-1">
                  {(
                    comboData.reduce((acc, d) => acc + d.margenEbitda, 0) /
                    comboData.length
                  ).toFixed(1)}
                  %
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                <div className="text-amber-700 text-xs font-semibold">
                  EBITDA Máximo
                </div>
                <div className="text-amber-900 text-lg font-bold mt-1">
                  $
                  {Math.max(...comboData.map((d) => d.ebitda)).toLocaleString(
                    "es-CL",
                    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                  )}
                </div>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
                <div className="text-purple-700 text-xs font-semibold">
                  Margen Máximo
                </div>
                <div className="text-purple-900 text-lg font-bold mt-1">
                  {Math.max(...comboData.map((d) => d.margenEbitda)).toFixed(1)}%
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Notes Section */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4 flex flex-col">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            📝 Notas del análisis:
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agrega tus observaciones sobre el análisis combo del EBITDA..."
            className="flex-grow w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 resize-none min-h-[200px] bg-gray-50"
          />
        </div>
      </div>
    </div>
  );
}