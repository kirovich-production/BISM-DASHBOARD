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
  rawData?: unknown[];
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
  sevillaData?: EERRData;  
  labranzaData?: EERRData;
  selectedUserName?: string;
  selectedPeriod?: string;
}

export default function EbidtaComboView({
  consolidadoData,
  sevillaData,
  labranzaData,
  selectedUserName,
  selectedPeriod,
}: EbidtaComboViewProps) {
  const chartRef = useRef<ChartJS>(null);
  const [notes, setNotes] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<'consolidado' | 'sevilla' | 'labranza'>('consolidado');

  // Función para obtener datos activos según la unidad seleccionada
  const getActiveData = (): ExcelRow[] => {
    switch (selectedUnit) {
      case 'sevilla':
        return convertEERRToExcelRows(sevillaData);
      case 'labranza':
        return convertEERRToExcelRows(labranzaData);
      case 'consolidado':
      default:
        return consolidadoData || [];
    }
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
    
    // Buscar filas igual que en EbidtaChartsView
    const ebitdaRow = data.find(
      (row: ExcelRow) =>
        row.Item?.toLowerCase().includes("ebitda") ||
        row.Item?.toLowerCase().includes("ebidta")
    );

    const ventasNetasRow = data.find(
      (row: ExcelRow) =>
        row.Item?.toLowerCase().includes("ventas netas") ||
        row.Item?.toLowerCase().includes("ventas afectas") ||
        row.Item === "Ventas Netas"
    );

    // Debug: Mostrar qué filas encontró
    console.log(`🔍 [EbidtaComboView-${selectedUnit}] Filas encontradas:`);
    console.log("- EBITDA Row:", ebitdaRow?.Item, ebitdaRow);
    console.log("- Ventas Netas Row:", ventasNetasRow?.Item, ventasNetasRow);
    console.log("- Total filas en data:", data.length);
    console.log("- Primeras 3 filas:", data.slice(0, 3));

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

      // Debug para los primeros 3 meses
      if (index < 3) {
        console.log(
          `📊 [${selectedUnit}-${fullMonth}] Raw: EBITDA="${ebitdaRaw}", Ventas="${ventasRaw}"`
        );
        console.log(
          `📊 [${selectedUnit}-${fullMonth}] Parsed: EBITDA=${ebitda}, Ventas=${ventasNetas}, Margen=${margenEbitda.toFixed(
            2
          )}%`
        );
      }

      return {
        month: shortMonth,
        ebitda,
        ventasNetas,
        margenEbitda,
      };
    });

    console.log(
      `📈 [EbidtaComboView-${selectedUnit}] Datos procesados:`,
      processedData.slice(0, 3)
    );
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

  // Función para exportar PDF usando Browserless (como MesAnualChartsView)
  const exportPDF = async () => {
    if (!chartRef.current) {
      alert("Gráfico no disponible para exportar");
      return;
    }

    try {
      console.log("🎯 Iniciando generación PDF Análisis Combo EBITDA...");

      // Capturar el gráfico
      let chartImageData = "";
      if (chartRef.current) {
        try {
          const canvas = chartRef.current.canvas;
          if (canvas) {
            chartImageData = canvas.toDataURL("image/png", 0.95);
            console.log("✅ Gráfico capturado exitosamente");
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
          <title>Análisis Combo EBITDA - ${
            selectedUserName || "Usuario"
          }</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif;
              background: #ffffff;
              color: #1f2937;
              line-height: 1.4;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 15px;
            }
            .header h1 {
              color: #3b82f6;
              font-size: 28px;
              margin: 0 0 10px 0;
              font-weight: bold;
            }
            .header p {
              color: #6b7280;
              font-size: 14px;
              margin: 0;
            }
            .chart-container {
              text-align: center;
              margin: 20px 0;
              background: white;
              border-radius: 12px;
              padding: 20px;
              border: 1px solid #e5e7eb;
            }
            .chart-image {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
            }
            .summary-section {
              margin: 30px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .summary-title {
              color: #374151;
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: white;
              border-radius: 12px;
              padding: 20px;
              border: 2px solid #e5e7eb;
              text-align: center;
            }
            .card-ebitda-prom {
              border-left: 6px solid #3b82f6;
              background: #eff6ff;
            }
            .card-margen-prom {
              border-left: 6px solid #10b981;
              background: #ecfdf5;
            }
            .card-ebitda-max {
              border-left: 6px solid #f59e0b;
              background: #fffbeb;
            }
            .card-margen-max {
              border-left: 6px solid #8b5cf6;
              background: #f3e8ff;
            }
            .card-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
            }
            .card-ebitda-prom .card-title { color: #1e40af; }
            .card-margen-prom .card-title { color: #059669; }
            .card-ebitda-max .card-title { color: #d97706; }
            .card-margen-max .card-title { color: #7c3aed; }
            .card-value {
              font-size: 24px;
              font-weight: bold;
            }
            .card-ebitda-prom .card-value { color: #1e3a8a; }
            .card-margen-prom .card-value { color: #047857; }
            .card-ebitda-max .card-value { color: #92400e; }
            .card-margen-max .card-value { color: #6b21a8; }
            .insights-section {
              background: linear-gradient(to right, #eff6ff, #ecfdf5);
              border: 2px solid #3b82f6;
              border-radius: 12px;
              padding: 20px;
              margin: 30px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .insights-title {
              color: #374151;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .insights-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .insight-item {
              font-size: 14px;
            }
            .insight-label {
              font-weight: 600;
              margin-bottom: 5px;
            }
            .insight-blue { color: #1e40af; }
            .insight-green { color: #059669; }
            .insight-text {
              color: #6b7280;
              line-height: 1.5;
            }
            .notes-section {
              background: #ffffff;
              border: 2px solid #aeacaaff;
              border-radius: 12px;
              padding: 20px;
              margin: 30px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .notes-title {
              color: #0000011;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .notes-content {
              color: #6b7280;
              font-size: 14px;
              line-height: 1.6;
              white-space: pre-wrap;
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
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Análisis Combo EBITDA</h1>
            
          </div>

          ${
            chartImageData
              ? `
          <div class="chart-container">
            <img src="${chartImageData}" alt="Gráfico Análisis Combo EBITDA" class="chart-image" />
          </div>
          `
              : ""
          }

          ${
            comboData.length > 0
              ? `
          <div class="summary-section">
            <h2 class="summary-title">Métricas de Resumen</h2>
            <div class="summary-grid">
              <div class="summary-card card-ebitda-prom">
                <div class="card-title">EBITDA Promedio</div>
                <div class="card-value">$${ebitdaPromedio.toLocaleString(
                  "es-CL",
                  { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                )}</div>
              </div>
              <div class="summary-card card-margen-prom">
                <div class="card-title">Margen Promedio</div>
                <div class="card-value">${margenPromedio.toFixed(1)}%</div>
              </div>
              <div class="summary-card card-ebitda-max">
                <div class="card-title">EBITDA Máximo</div>
                <div class="card-value">$${ebitdaMaximo.toLocaleString(
                  "es-CL",
                  { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                )}</div>
              </div>
              <div class="summary-card card-margen-max">
                <div class="card-title">Margen Máximo</div>
                <div class="card-value">${margenMaximo.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          `
              : ""
          }

         

          ${
            notes.trim()
              ? `
              
          <div class="notes-section">
            <h3 class="notes-title">Notas del Análisis</h3>
            <div class="notes-content">${notes}</div>
          </div>
          
          `
              : ""
          }

          <div class="footer">
            <span>BISM Dashboard - Documento generado automáticamente</span>
            <span>Análisis Combo EBITDA - ${currentDate}</span>
          </div>
        </body>
        </html>
      `;

      console.log("📤 Enviando HTML a API de generación de PDF...");

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
      console.log("✅ PDF generado exitosamente");

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

      console.log("📁 Archivo descargado exitosamente");
    } catch (error) {
      console.error("❌ Error al generar PDF:", error);
      alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 overflow-auto">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {comboData.length > 0 && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-700 text-sm font-medium">
                EBITDA Promedio
              </div>
              <div className="text-blue-900 text-lg font-bold">
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

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-700 text-sm font-medium">
                Margen Promedio
              </div>
              <div className="text-green-900 text-lg font-bold">
                {(
                  comboData.reduce((acc, d) => acc + d.margenEbitda, 0) /
                  comboData.length
                ).toFixed(1)}
                %
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-amber-700 text-sm font-medium">
                EBITDA Máximo
              </div>
              <div className="text-amber-900 text-lg font-bold">
                $
                {Math.max(...comboData.map((d) => d.ebitda)).toLocaleString(
                  "es-CL",
                  { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                )}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-purple-700 text-sm font-medium">
                Margen Máximo
              </div>
              <div className="text-purple-900 text-lg font-bold">
                {Math.max(...comboData.map((d) => d.margenEbitda)).toFixed(1)}%
              </div>
            </div>
          </>
        )}
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}
