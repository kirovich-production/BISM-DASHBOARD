"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Bar, Line } from "react-chartjs-2";
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
import type { ExcelRow, EERRData } from "@/types";
import AddToReportButton from "./AddToReportButton";

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
  consolidadoData: ExcelRow[];
  sucursalesData: Array<{
    name: string;  // Nombre de la sucursal ("Sevilla", "Pan de Azúcar", etc.)
    data: EERRData | null;
  }>;
  periodLabel: string;
}

// Definición de trimestres
const QUARTERS = {
  Q1: {
    label: "Q1 (Ene-Mar)",
    shortLabel: "Q1",
    months: ["Enero", "Febrero", "Marzo"],
  },
  Q2: {
    label: "Q2 (Abr-Jun)",
    shortLabel: "Q2",
    months: ["Abril", "Mayo", "Junio"],
  },
  Q3: {
    label: "Q3 (Jul-Sep)",
    shortLabel: "Q3",
    months: ["Julio", "Agosto", "Septiembre"],
  },
  Q4: {
    label: "Q4 (Oct-Dic)",
    shortLabel: "Q4",
    months: ["Octubre", "Noviembre", "Diciembre"],
  },
} as const;

type QuarterKey = keyof typeof QUARTERS;

// Función para parsear valores monetarios
const parseValue = (value: string | number | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value === "#DIV/0!" || value === "" || value === "$0") return 0;
    let cleaned = value.replace(/\$|\s/g, "");
    if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/,/g, "");
    }
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Función para convertir EERRData a ExcelRow[]
const convertEERRToExcelRows = (eerrData: EERRData): ExcelRow[] => {
  const rows: ExcelRow[] = [];
  
  eerrData.categories.forEach((category) => {
    category.rows.forEach((row) => {
      rows.push(row);
    });
    
    // Agregar fila de total si existe
    if (category.total) {
      rows.push(category.total);
    }
  });
  
  return rows;
};

export default function TrimestralAnalysisView({
  consolidadoData,
  sucursalesData,
  periodLabel,
}: TrimestralAnalysisViewProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>('consolidado');
  const [selectedQuarter1, setSelectedQuarter1] = useState<QuarterKey>("Q1");
  const [selectedQuarter2, setSelectedQuarter2] = useState<QuarterKey>("Q3");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState<"comparison" | "evolution">(
    "comparison"
  );
  const [notes, setNotes] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPdfWarning, setShowPdfWarning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Limpiar ítems seleccionados cuando cambie la unidad y auto-seleccionar algunos ítems
  useEffect(() => {
    setSelectedItems([]);
    
    // Auto-seleccionar los primeros 3 ítems si hay datos disponibles
    setTimeout(() => {
      const currentActiveData = getActiveData();
      
      if (currentActiveData.length > 0) {
        // Filtrar items válidos que tengan datos en al menos un mes
        const validItems = currentActiveData
          .filter(row => {
            if (!row.Item || typeof row.Item !== "string" || row.Item.trim() === "") {
              return false;
            }
            
            // Verificar que tenga al menos una columna con datos de meses
            const hasMonthData = Object.keys(row).some(key => {
              const lowerKey = key.toLowerCase();
              return (lowerKey.includes('enero') || lowerKey.includes('febrero') || 
                      lowerKey.includes('marzo') || lowerKey.includes('abril') ||
                      lowerKey.includes('mayo') || lowerKey.includes('junio') ||
                      lowerKey.includes('julio') || lowerKey.includes('agosto') ||
                      lowerKey.includes('septiembre') || lowerKey.includes('octubre') ||
                      lowerKey.includes('noviembre') || lowerKey.includes('diciembre')) &&
                     row[key] !== undefined && row[key] !== null && row[key] !== "";
            });
            
            return hasMonthData;
          })
          .slice(0, 3)
          .map(row => row.Item);
        
        if (validItems.length > 0) {
          setSelectedItems(validItems);
        }
      }
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit, consolidadoData, sucursalesData]);

  // Extraer ítems disponibles
  const availableItems = useMemo(() => {
    return activeData
      .map((row: ExcelRow) => row.Item)
      .filter(
        (item): item is string => typeof item === "string" && item.trim() !== ""
      )
      .slice(0, 100); // Aumentar límite para mostrar más ítems
  }, [activeData]);

  // Función para calcular métricas trimestrales
  const calculateQuarterMetrics = useMemo(
    () => (quarterKey: QuarterKey, item: string) => {
      const quarter = QUARTERS[quarterKey];
      const itemRow = activeData.find((row: ExcelRow) => row.Item === item);

      if (!itemRow) {
        return {
          total: 0,
          average: 0,
          peak: 0,
          peakMonth: "",
          values: [0, 0, 0],
        };
      }

      
      const values = quarter.months.map((month) => {
        // Buscar columna que contenga el nombre del mes (case-insensitive)
        const monthLower = month.toLowerCase();
        const matchingColumn = Object.keys(itemRow).find(col => 
          col.toLowerCase().includes(monthLower) && 
          (col.toLowerCase().includes('monto') || col.toLowerCase().includes('value'))
        );
        
        const rawValue = matchingColumn ? itemRow[matchingColumn] : undefined;
        const parsedValue = parseValue(rawValue);
        return parsedValue;
      });

      const total = values.reduce((acc, val) => acc + val, 0);
      const average = total / 3;
      const peak = Math.max(...values);
      const peakIndex = values.indexOf(peak);
      const peakMonth = quarter.months[peakIndex];

      return { total, average, peak, peakMonth, values };
    },
    [activeData]
  );

  // Datos para gráfico de comparación trimestral
  const comparisonChartData = useMemo(() => {
    
    if (selectedItems.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    // Labels serán los nombres de los ítems seleccionados
    const labels = selectedItems;

    // Crear dos datasets: uno para cada trimestre
    
    const q1Data = selectedItems.map((item) => {
      const metrics = calculateQuarterMetrics(selectedQuarter1, item);
      return metrics.total;
    });

    const q2Data = selectedItems.map((item) => {
      const metrics = calculateQuarterMetrics(selectedQuarter2, item);
      return metrics.total;
    });

    const datasets = [
      {
        label: QUARTERS[selectedQuarter1].label,
        data: q1Data,
        backgroundColor: "#3b82f6", // Azul para Q1
        borderColor: "#3b82f6",
        borderWidth: 2,
      },
      {
        label: QUARTERS[selectedQuarter2].label,
        data: q2Data,
        backgroundColor: "#f59e0b", // Naranja para Q2
        borderColor: "#f59e0b",
        borderWidth: 2,
      },
    ];

    return {
      labels,
      datasets,
    };
  }, [
    selectedQuarter1,
    selectedQuarter2,
    selectedItems,
    calculateQuarterMetrics,
  ]);

  // Datos para gráfico de evolución mensual
  const evolutionChartData = useMemo(() => {
    if (selectedItems.length === 0) return { labels: [], datasets: [] };

    const allMonths = [
      ...QUARTERS[selectedQuarter1].months,
      ...QUARTERS[selectedQuarter2].months,
    ];

    const datasets = selectedItems
      .map((item, index) => {
        const itemRow = activeData.find((row: ExcelRow) => row.Item === item);
        if (!itemRow) return null;

        const values = allMonths.map((month) =>
          parseValue(itemRow[`${month} Monto`])
        );

        const colors = [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#06b6d4",
          "#84cc16",
          "#f97316",
          "#ec4899",
          "#6366f1",
        ];

        return {
          label: item,
          data: values,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + "20",
          borderWidth: 3,
          fill: false,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
        };
      })
      .filter(
        (dataset): dataset is NonNullable<typeof dataset> => dataset !== null
      );

    return {
      labels: allMonths.map((month) => month.substring(0, 3)), // Abreviar nombres
      datasets,
    };
  }, [selectedQuarter1, selectedQuarter2, selectedItems, activeData]);

  // Opciones del gráfico de comparación
  const comparisonOptions: ChartOptions<"bar"> = {
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
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: ${new Intl.NumberFormat("es-CL", {
              style: "currency",
              currency: "CLP",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)}`;
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
        beginAtZero: true,
        title: {
          display: true,
          text: "Total Trimestral (CLP)",
          color: "#374151",
          font: {
            size: 12,
            weight: "bold",
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: "#374151",
          callback: function (value) {
            return new Intl.NumberFormat("es-CL", {
              notation: "compact",
              compactDisplay: "short",
            }).format(value as number);
          },
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
  };

  // Opciones del gráfico de evolución
  const evolutionOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: `Evolución Mensual: ${QUARTERS[selectedQuarter1].label} + ${QUARTERS[selectedQuarter2].label}`,
        font: { size: 16, weight: "bold" },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: ${new Intl.NumberFormat("es-CL", {
              style: "currency",
              currency: "CLP",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return new Intl.NumberFormat("es-CL", {
              notation: "compact",
              compactDisplay: "short",
            }).format(value as number);
          },
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
  };

  // Función para toggle de ítems
  const toggleItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
    // Ocultar advertencia si se reduce a 8 o menos
    if (selectedItems.length <= 8 && showPdfWarning) {
      setShowPdfWarning(false);
    }
  };

  // Calcular métricas comparativas
  const getComparativeMetrics = () => {
    return selectedItems.map((item) => {
      const q1Metrics = calculateQuarterMetrics(selectedQuarter1, item);
      const q2Metrics = calculateQuarterMetrics(selectedQuarter2, item);

      const variation =
        q1Metrics.total !== 0
          ? ((q2Metrics.total - q1Metrics.total) / q1Metrics.total) * 100
          : 0;

      return {
        item,
        q1: q1Metrics,
        q2: q2Metrics,
        variation,
        winner:
          q1Metrics.total > q2Metrics.total
            ? selectedQuarter1
            : selectedQuarter2,
      };
    });
  };

  const comparativeMetrics = getComparativeMetrics();

  // Función para generar HTML del análisis (compartida entre PDF individual y reporte)
  const generateAnalysisHTML = async (includeNotes: boolean = true, includeHeader: boolean = true) => {
    // Capturar el gráfico como imagen
    let chartImageBase64 = "";
    const chartContainer = contentRef.current;

    if (chartContainer) {
      const canvas = chartContainer.querySelector("canvas");
      if (canvas) {
        try {
          chartImageBase64 = canvas.toDataURL("image/png", 0.8);
        } catch (error) {
          console.warn("⚠️ No se pudo capturar el gráfico:", error);
        }
      }
    }

    const currentDate = new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Análisis Trimestral Comparativo - ${periodLabel}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            color: #1f2937;
            line-height: 1.4;
          }
          
          .trimestral-page-wrapper {
            page-break-before: avoid;
            break-before: avoid;
          }
          
          .trimestral-header {
            page-break-after: avoid;
            break-after: avoid;
            text-align: center;
            margin: 0 0 15px 0;
            padding: 10px 15px 12px 15px;
            border-bottom: 3px solid #8b5cf6;
          }
          .trimestral-header h1 {
            color: #1f2937;
            font-size: 24px;
            margin: 0 0 6px 0;
            font-weight: bold;
            letter-spacing: -0.3px;
          }
          .trimestral-header .business-unit {
            color: #8b5cf6;
            padding: 0;
            font-size: 14px;
            font-weight: 600;
            display: block;
            margin: 4px 0 6px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .trimestral-header p {
            color: #6b7280;
            font-size: 10px;
            margin: 0;
            font-weight: normal;
          }
          
          .trimestral-main {
            padding: ${includeHeader ? '10px' : '0'};
            page-break-before: avoid;
            break-before: avoid;
          }
          
          .trimestral-grid {
            display: grid;
            grid-template-columns: 70% 30%;
            grid-template-rows: auto auto;
            gap: 20px;
            align-items: start;
            page-break-before: avoid;
            break-before: avoid;
            margin-top: ${includeHeader ? '0' : '-10px'};
          }

          .trimestral-chart {
            grid-column: 1;
            grid-row: 1;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-before: avoid;
            break-before: avoid;
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          .trimestral-chart-title {
            color: #374151;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
            flex-shrink: 0;
          }
          .trimestral-chart-image {
            max-width: 100%;
            width: 100%;
            height: 100%;
            max-height: none;
            object-fit: fill;
            object-position: center;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: block;
            margin-bottom: 0;
            flex: 1;
          }
          .trimestral-chart-image.compact {
            max-height: none;
          }
          .trimestral-chart-placeholder {
            background: #f3f4f6;
            padding: 40px;
            border: 2px dashed #9ca3af;
            border-radius: 8px;
            color: #6b7280;
            font-style: italic;
            font-size: 14px;
          }

          .trimestral-metrics {
            grid-column: 2;
            grid-row: 1 / 3;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
            max-width: 100%;
          }
          .trimestral-metrics-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .trimestral-metric-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-left: 6px solid #8b5cf6;
            border-radius: 10px;
            padding: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .trimestral-metric-card.compact {
            padding: 6px;
            border-radius: 6px;
            border-left-width: 3px;
          }
          .trimestral-metric-title {
            font-weight: bold;
            color: #1f2937;
            font-size: 14px;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
          }
          .trimestral-metric-title.compact {
            font-size: 10px;
            margin-bottom: 4px;
            padding-bottom: 3px;
          }
          .trimestral-metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            padding: 4px 0;
          }
          .trimestral-metric-row.compact {
            margin-bottom: 4px;
            padding: 2px 0;
          }
          .trimestral-metric-label {
            font-weight: 600;
            color: #4b5563;
            font-size: 11px;
          }
          .trimestral-metric-label.compact {
            font-size: 8px;
          }
          .trimestral-metric-value {
            font-weight: bold;
            font-size: 12px;
          }
          .trimestral-metric-value.compact {
            font-size: 9px;
          }
          .trimestral-metric-q1 { color: #3b82f6; }
          .trimestral-metric-q2 { color: #10b981; }
          .trimestral-variation-positive { color: #10b981; }
          .trimestral-variation-negative { color: #ef4444; }
          .trimestral-winner-badge {
            background: #e0f2fe;
            color: #0277bd;
            padding: 3px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
          }

          .trimestral-notes {
            grid-column: 1;
            grid-row: 2;
            background: #ffffff;
            border: 1px solid #6b7280;
            border-radius: 12px;
            padding: 15px;
            page-break-inside: auto;
            break-inside: auto;
            width: 100%;
            max-width: 100%;
            margin-top: 15px;
            text-align: left;
          }
          .trimestral-notes-title {
            color: #000000;
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
            text-align: left;
          }
          .trimestral-notes-content {
            color: #000000;
            line-height: 1.6;
            font-size: 12px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="trimestral-page-wrapper">
          <div class="trimestral-main">
            ${includeHeader ? `<div class="trimestral-header">
              <h1>📊 Análisis Trimestral Comparativo</h1>
              <div class="business-unit">
                ${selectedUnit === 'consolidado' ? '🏢 Consolidado' : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}
              </div>
              <p>Período: ${periodLabel} | Generado: ${currentDate}</p>
            </div>` : ''}
            
            <div class="trimestral-grid">
              <div class="trimestral-chart">
                <h3 class="trimestral-chart-title">
                  ${analysisType === "comparison"
                    ? `📊 Gráfico de Comparación: ${QUARTERS[selectedQuarter1].label} vs ${QUARTERS[selectedQuarter2].label}`
                    : `📈 Gráfico de Evolución: ${QUARTERS[selectedQuarter1].label} + ${QUARTERS[selectedQuarter2].label}`}
                </h3>
                ${chartImageBase64
                  ? `<img src="${chartImageBase64}" alt="Gráfico de Análisis Trimestral" class="trimestral-chart-image ${comparativeMetrics.length >= 4 ? 'compact' : ''}" />`
                  : `<div class="trimestral-chart-placeholder">Gráfico no disponible</div>`}
              </div>

              <div class="trimestral-metrics">
                <div class="trimestral-metrics-grid compact">
                  ${comparativeMetrics.map((metric) => {
                    const isCompact = true;
                    return `
                      <div class="trimestral-metric-card ${isCompact ? 'compact' : ''}">
                        <div class="trimestral-metric-title ${isCompact ? 'compact' : ''}">${metric.item}</div>
                        <div class="trimestral-metric-row ${isCompact ? 'compact' : ''}">
                          <span class="trimestral-metric-label ${isCompact ? 'compact' : ''}">${QUARTERS[selectedQuarter1].label}</span>
                          <span class="trimestral-metric-value ${isCompact ? 'compact' : ''} trimestral-metric-q1">$${metric.q1.total.toLocaleString("es-CL")}</span>
                        </div>
                        <div class="trimestral-metric-row ${isCompact ? 'compact' : ''}">
                          <span class="trimestral-metric-label ${isCompact ? 'compact' : ''}">${QUARTERS[selectedQuarter2].label}</span>
                          <span class="trimestral-metric-value ${isCompact ? 'compact' : ''} trimestral-metric-q2">$${metric.q2.total.toLocaleString("es-CL")}</span>
                        </div>
                        <div class="trimestral-metric-row ${isCompact ? 'compact' : ''}">
                          <span class="trimestral-metric-label ${isCompact ? 'compact' : ''}">Variación</span>
                          <span class="trimestral-metric-value ${isCompact ? 'compact' : ''} ${metric.variation >= 0 ? "trimestral-variation-positive" : "trimestral-variation-negative"}">
                            ${metric.variation >= 0 ? "+" : ""}${metric.variation.toFixed(1)}%
                          </span>
                        </div>
                        <div class="trimestral-metric-row ${isCompact ? 'compact' : ''}">
                          <span class="trimestral-metric-label ${isCompact ? 'compact' : ''}">Mejor Trimestre</span>
                          <span class="trimestral-winner-badge">${QUARTERS[metric.winner].label}</span>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>

              ${includeNotes && notes.trim() ? `
                <div class="trimestral-notes">
                  <div class="trimestral-notes-title">Análisis del gráfico:</div>
                  <div class="trimestral-notes-content">${notes.replace(/\n/g, "<br>")}</div>
                </div>
              ` : ""}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Función para generar PDF del análisis trimestral
  const generatePDF = async () => {
    if (selectedItems.length === 0) {
      setShowPdfWarning(true);
      return;
    }

    if (selectedItems.length > 4) {
      setShowPdfWarning(true);
      return;
    }

    setIsGeneratingPdf(true);
    setShowPdfWarning(false);

    try {
      // Usar el generador compartido con notas
      const analysisHtml = await generateAnalysisHTML(true);

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: analysisHtml,
          options: {
            format: "A4",
            printBackground: true,
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.5in",
              left: "0.5in",
            },
          },
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
      a.download = `analisis-trimestral-${selectedQuarter1}-vs-${selectedQuarter2}-${periodLabel}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("❌ Error al generar PDF:", error);
      alert("Error al generar el PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-3 rounded-lg shadow-lg">
              <svg
                className="w-6 h-6 text-white"
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
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📊 Análisis Trimestral Comparativo
              </h1>
              <p className="text-sm text-gray-800">
                Período: {periodLabel} - Análisis por Q1, Q2, Q3, Q4
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                  {selectedUnit === 'consolidado' 
                    ? '📊 Datos Consolidado' 
                    : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Advertencia para PDF */}
          {showPdfWarning && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border-2 border-amber-400 rounded-lg shadow-md animate-pulse">
              <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">
                  {selectedItems.length === 0 
                    ? "Debes seleccionar al menos un ítem para exportar" 
                    : `Para exportar a PDF, selecciona máximo 4 ítems`}
                </p>
                {selectedItems.length > 4 && (
                  <p className="text-xs text-amber-800 mt-1">
                    Actualmente tienes {selectedItems.length} ítems seleccionados. Por favor, reduce tu selección.
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowPdfWarning(false)}
                className="text-amber-600 hover:text-amber-800 font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-3">
            <AddToReportButton
              viewName={`Análisis Trimestral - ${selectedUnit === 'consolidado' ? 'Consolidado' : sucursalesData.find(s => createSlug(s.name) === selectedUnit)?.name || selectedUnit}`}
              uniqueKey={`TrimestralAnalysis-${selectedUnit}-${selectedQuarter1}-${selectedQuarter2}-${[...selectedItems].sort().join(',')}-${periodLabel}`}
              contentRef={contentRef as React.RefObject<HTMLElement>}
              period={periodLabel}
              disabled={selectedItems.length === 0 || selectedItems.length > 4}
              captureMode="html"
              htmlGenerator={() => generateAnalysisHTML(true, false)}
            />
            
            {selectedItems.length > 4 && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Máximo 4 ítems permitidos para agregar al reporte ({selectedItems.length}/4)
              </p>
            )}
            
            <button
              onClick={generatePDF}
              disabled={isGeneratingPdf || selectedItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isGeneratingPdf ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
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
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Unidad de Negocio - Dinámico */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🏢 Unidad de Negocio
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Botón Consolidado */}
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
          
          {/* Botones de sucursales dinámicos */}
          {sucursalesData.map((sucursal, index) => {
            const sucursalSlug = createSlug(sucursal.name);
            const isActive = selectedUnit === sucursalSlug;
            const hasData = sucursal.data !== null;
            const rowCount = hasData && sucursal.data ? convertEERRToExcelRows(sucursal.data).length : 0;
            
            // Colores dinámicos por sucursal
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

      {/* Controles de Selección */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuración del Análisis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Selector Trimestre 1 */}
          <div>
            <select
              value={selectedQuarter1}
              onChange={(e) =>
                setSelectedQuarter1(e.target.value as QuarterKey)
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-400"
            >
              {Object.entries(QUARTERS).map(([key, quarter]) => (
                <option key={key} value={key} className="py-2">
                  {quarter.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-700 mt-1">
              Trimestre de referencia
            </p>
          </div>

          {/* Selector Trimestre 2 */}
          <div>
            <select
              value={selectedQuarter2}
              onChange={(e) =>
                setSelectedQuarter2(e.target.value as QuarterKey)
              }
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
              onChange={(e) =>
                setAnalysisType(e.target.value as "comparison" | "evolution")
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium transition-all duration-200 hover:border-gray-400"
            >
              <option value="comparison" className="py-2">
                Comparación Trimestral
              </option>
              <option value="evolution" className="py-2">
                Evolución Mensual
              </option>
            </select>
            <p className="text-xs text-gray-700 mt-1">Modo de visualización</p>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg mb-1">
                {analysisType === "comparison"}
              </div>
              <p className="font-bold text-purple-900 text-sm mb-1">
                {analysisType === "comparison" ? "Comparando" : "Evolución"}
              </p>
              <p className="text-xs text-purple-800 font-medium">
                {QUARTERS[selectedQuarter1].shortLabel} vs{" "}
                {QUARTERS[selectedQuarter2].shortLabel}
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
                disabled={availableItems.length === 0}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Seleccionar top 5
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {availableItems.map((item: string, index: number) => (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 text-left relative group ${
                  selectedItems.includes(item)
                    ? "border-purple-500 bg-purple-50 text-purple-900 shadow-md"
                    : "border-gray-200 bg-white text-gray-900 hover:border-purple-300 hover:bg-purple-25 hover:shadow-sm"
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
                💡 Selecciona uno o más ítems para comenzar el análisis
                trimestral
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6" ref={contentRef}>
        <div className="h-[800px]">
          {selectedItems.length > 0 ? (
            analysisType === "comparison" ? (
              <Bar data={comparisonChartData} options={comparisonOptions} />
            ) : (
              <Line data={evolutionChartData} options={evolutionOptions} />
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Selecciona ítems para analizar
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Elige los elementos que deseas comparar entre trimestres
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Comparativas */}
      {selectedItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          {comparativeMetrics.map((metric) => (
            <div
              key={metric.item}
              className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500"
            >
              <h4 className="font-semibold text-gray-900 mb-4">
                {metric.item}
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-800 font-medium">
                    {QUARTERS[selectedQuarter1].label}
                  </span>
                  <span className="font-medium text-blue-600">
                    $
                    {metric.q1.total.toLocaleString("es-CL", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-800 font-medium">
                    {QUARTERS[selectedQuarter2].label}
                  </span>
                  <span className="font-medium text-green-600">
                    $
                    {metric.q2.total.toLocaleString("es-CL", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Variación
                    </span>
                    <span
                      className={`font-bold ${
                        metric.variation >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {metric.variation >= 0 ? "+" : ""}
                      {metric.variation.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-900">
                      Mejor Trimestre
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        metric.winner === selectedQuarter1
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
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
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
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