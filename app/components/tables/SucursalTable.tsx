'use client';

import React, { useState, useRef } from 'react';
import { EERRData, EERRCategory, EERRRow } from '@/types';
import EditableCell from '../EditableCell';

interface SucursalTableProps {
  data: EERRData | null;
  periodLabel: string;
  version?: number;
  uploadedAt?: string | Date;
  userId?: string;
  sucursalName?: string;
  onDataRefresh?: () => void;
}

export default function SucursalTable({ data, periodLabel, version, uploadedAt, userId, sucursalName, onDataRefresh }: SucursalTableProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay datos disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron datos para esta sucursal en el período seleccionado.
          </p>
        </div>
      </div>
    );
  }


  if (data.categories.length > 0 && data.categories[0].rows.length > 0) {
   
  }

  const formatNumber = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    // Si es string, limpiar formato (remover $, comas, espacios)
    let num: number;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '').trim();
      num = parseFloat(cleaned);
    } else {
      num = value;
    }
    
    if (isNaN(num)) return '-';
    
    // Formatear con símbolo de peso chileno
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    // Si es string, limpiar formato (remover %, espacios)
    let num: number;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[%\s]/g, '').trim();
      num = parseFloat(cleaned);
    } else {
      num = value;
    }
    
    if (isNaN(num)) return '-';
    // Usar 2 decimales para mayor precisión
    return `${num.toFixed(2)}%`;
  };

  // Detectar si existe CONSOLIDADO o ANUAL
  const consolidadoColumn = data.months.find(m => m.toUpperCase().includes('CONSOLIDADO') || m.toUpperCase().includes('ANUAL')) || 'CONSOLIDADO';
  const regularMonths = data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO') && !m.toUpperCase().includes('ANUAL'));

  // Dividir meses en 3 páginas para PDF
  const page1Months = regularMonths.slice(0, 5);  // Enero a Mayo
  const page2Months = regularMonths.slice(5, 10); // Junio a Octubre
  const page3Months = regularMonths.slice(10);    // Noviembre y Diciembre

  // Función helper para generar HTML de tabla por página
  const generateTableHTML = (months: string[], includeAnual: boolean, pageNumber: number) => {
    const pageTitle = pageNumber === 1 ? 'Enero - Mayo' : pageNumber === 2 ? 'Junio - Octubre' : 'Noviembre - Diciembre + Anual';
    
    let tableHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1>${sucursalName || 'Sucursal Sevilla'}</h1>
          <p>Período: ${periodLabel} | ${pageTitle} | Página ${pageNumber} de 3</p>
        </div>
        <table>
          <thead>
            <tr>
              <th class="concept-header">Concepto</th>
              ${months.map(month => `<th colspan="2">${month}</th>`).join('')}
              ${includeAnual ? `<th colspan="3">${consolidadoColumn.toUpperCase()}</th>` : ''}
            </tr>
            <tr>
              <th class="concept-header"></th>
              ${months.map(() => '<th>Monto</th><th>%</th>').join('')}
              ${includeAnual ? '<th>Monto</th><th>%</th><th>Promedio</th>' : ''}
            </tr>
          </thead>
          <tbody>`;

    // Generar filas de categorías y datos
    data.categories.forEach((category: EERRCategory) => {
      // Fila de categoría
      const totalCols = (months.length * 2) + (includeAnual ? 3 : 0) + 1;
      tableHTML += `
        <tr class="category-row">
          <td class="category-name">${category.name}</td>
          <td colspan="${totalCols - 1}"></td>
        </tr>`;

      // Filas de datos
      category.rows.forEach((row: EERRRow) => {
        tableHTML += `<tr class="data-row"><td class="item-name">${row.Item}</td>`;
        
        months.forEach(month => {
          const monto = row[`${month} Monto`];
          const porcentaje = row[`${month} %`];
          tableHTML += `
            <td class="numeric">${formatNumber(monto)}</td>
            <td class="numeric">${formatPercentage(porcentaje)}</td>`;
        });

        if (includeAnual) {
          tableHTML += `
            <td class="numeric anual">${formatNumber(row[`${consolidadoColumn} Monto`])}</td>
            <td class="numeric anual">${formatPercentage(row[`${consolidadoColumn} %`])}</td>
            <td class="numeric anual">${formatNumber(row[`${consolidadoColumn} Promedio`])}</td>`;
        }

        tableHTML += '</tr>';
      });

      // Fila de total si existe
      if (category.total) {
        tableHTML += `<tr class="total-row"><td class="item-name">${category.total.Item}</td>`;
        
        months.forEach(month => {
          tableHTML += `
            <td class="numeric">${formatNumber(category.total![`${month} Monto`])}</td>
            <td class="numeric">${formatPercentage(category.total![`${month} %`])}</td>`;
        });

        if (includeAnual) {
          tableHTML += `
            <td class="numeric anual">${formatNumber(category.total![`${consolidadoColumn} Monto`])}</td>
            <td class="numeric anual">${formatPercentage(category.total![`${consolidadoColumn} %`])}</td>
            <td class="numeric anual">${formatNumber(category.total![`${consolidadoColumn} Promedio`])}</td>`;
        }

        tableHTML += '</tr>';
      }
    });

    tableHTML += `
          </tbody>
        </table>
      </div>`;

    return tableHTML;
  };

  const generatePDF = async () => {
    if (!contentRef.current || isGeneratingPdf) return;

    setIsGeneratingPdf(true);

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'fixed bottom-20 right-6 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-3';
    loadingDiv.innerHTML = `
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Generando PDF profesional...</span>
    `;
    document.body.appendChild(loadingDiv);

    try {
      
      // Preparar tabla para captura
      const scrollContainers = contentRef.current.querySelectorAll('.overflow-auto');
      const originalScrollPositions: number[] = [];
      scrollContainers.forEach((container, index) => {
        originalScrollPositions[index] = container.scrollLeft;
        container.scrollLeft = 0;
      });

      const stickyElements = contentRef.current.querySelectorAll('.sticky');
      stickyElements.forEach(el => {
        (el as HTMLElement).style.position = 'relative';
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      stickyElements.forEach(el => {
        (el as HTMLElement).style.position = 'sticky';
      });
      scrollContainers.forEach((container, index) => {
        container.scrollLeft = originalScrollPositions[index];
      });

      // Generar HTML de las 3 páginas
      const page1HTML = generateTableHTML(page1Months, false, 1);
      const page2HTML = generateTableHTML(page2Months, false, 2);
      const page3HTML = generateTableHTML(page3Months, true, 3);

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${sucursalName || 'Sucursal'} - ${periodLabel}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 15mm 10mm;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: white;
                color: #1f2937;
              }
              
              .page-container {
                page-break-after: always;
                width: 100%;
              }
              
              .page-container:last-child {
                page-break-after: avoid;
              }
              
              .page-header {
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 2px solid #4f46e5;
              }
              
              .page-header h1 {
                font-size: 16px;
                color: #4f46e5;
                font-weight: 700;
                margin-bottom: 4px;
              }
              
              .page-header p {
                font-size: 10px;
                color: #6b7280;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8px;
                table-layout: fixed;
              }
              
              th, td {
                border: 1px solid #d1d5db;
                padding: 5px 4px;
                text-align: center;
              }
              
              th {
                background-color: #4f46e5;
                color: white;
                font-weight: 600;
                font-size: 8px;
              }
              
              th.concept-header {
                text-align: left;
                width: 180px;
                padding: 5px 8px;
              }
              
              td.concept-name,
              td.item-name {
                text-align: left;
                padding: 5px 8px;
                width: 180px;
                font-weight: 600;
              }
              
              td.category-name {
                background: linear-gradient(to right, #e0e7ff, #eef2ff);
                color: #312e81;
                font-weight: 700;
                text-transform: uppercase;
                font-size: 9px;
              }
              
              td.numeric {
                text-align: right;
                font-size: 8px;
                white-space: nowrap;
              }
              
              td.numeric.anual {
                background-color: #eef2ff;
                font-weight: 600;
              }
              
              tr.category-row {
                background: linear-gradient(to right, #e0e7ff, #eef2ff);
                border-top: 2px solid #4f46e5;
              }
              
              tr.data-row:hover {
                background-color: #f9fafb;
              }
              
              tr.total-row {
                background-color: #eef2ff;
                font-weight: 700;
                border-top: 2px solid #c7d2fe;
              }
              
              tr.total-row td {
                color: #312e81;
              }
            </style>
          </head>
          <body>
            ${page1HTML}
            ${page2HTML}
            ${page3HTML}
          </body>
        </html>
      `;

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: fullHtml,
          title: `sucursal-sevilla-${periodLabel}`,
        }),
      });

      if (!response.ok) {
        // Si el servidor falla (503), intentar con fallback del cliente
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 503 || errorData.useClientFallback) {
          loadingDiv.innerHTML = `
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generando con método alternativo...</span>
          `;
          
          // Usar jsPDF como fallback
          const { default: jsPDF } = await import('jspdf');
          const { default: html2canvas } = await import('html2canvas');
          
          const canvas = await html2canvas(contentRef.current!, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
          });
          
          const imgWidth = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`sucursal-sevilla-${periodLabel}-${Date.now()}.pdf`);
          
          loadingDiv.remove();
          setIsGeneratingPdf(false);
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sucursal-sevilla-${periodLabel}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      
      loadingDiv.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>PDF descargado exitosamente</span>
      `;
      loadingDiv.className = loadingDiv.className.replace('bg-indigo-600', 'bg-green-600');
      
      setTimeout(() => {
        document.body.removeChild(loadingDiv);
      }, 3000);

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      
      loadingDiv.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span>Error al generar PDF</span>
      `;
      loadingDiv.className = loadingDiv.className.replace('bg-indigo-600', 'bg-red-600');
      
      setTimeout(() => {
        document.body.removeChild(loadingDiv);
      }, 3000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50" ref={contentRef}>
      {/* Header fijo */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">Sucursal Sevilla</h1>
            <p className="text-sm text-gray-600 mt-1">
              Período: {periodLabel}
              {version && ` • Versión ${version}`}
              {uploadedAt && ` • ${new Date(uploadedAt).toLocaleDateString('es-CL')}`}
            </p>
          </div>
          
          {/* Botón Exportar PDF */}
          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
          >
            {isGeneratingPdf ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabla continua única */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full divide-y divide-gray-300">
            {/* Header de la tabla */}
            <thead className="bg-indigo-600 sticky top-0 z-30">
              <tr>
                <th scope="col" className="sticky left-0 z-40 px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500 bg-indigo-600 shadow-lg">
                  Concepto
                </th>
                {regularMonths.map((month: string, monthIdx: number) => (
                  <th
                    key={monthIdx}
                    scope="col"
                    colSpan={2}
                    className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500"
                  >
                    {month}
                  </th>
                ))}
                {/* Columna consolidada (CONSOLIDADO o ANUAL) al final */}
                <th
                  scope="col"
                  colSpan={3}
                  className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500 bg-indigo-700"
                >
                  {consolidadoColumn.toUpperCase()}
                </th>
              </tr>
              <tr>
                <th scope="col" className="sticky left-0 z-40 px-6 py-2 bg-indigo-700 border-r border-indigo-500 shadow-lg"></th>
                {regularMonths.map((month: string, monthIdx: number) => (
                  <React.Fragment key={monthIdx}>
                    <th className="px-3 py-2 text-center text-xs font-medium text-white bg-indigo-700 border-r border-indigo-600">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-white bg-indigo-700 border-r border-indigo-600">
                      %
                    </th>
                  </React.Fragment>
                ))}
                {/* Sub-headers columna consolidada */}
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-indigo-800 border-r border-indigo-600">
                  Monto
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-indigo-800 border-r border-indigo-600">
                  %
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-indigo-800 border-r border-indigo-600">
                  Promedio
                </th>
              </tr>
            </thead>

            {/* Body de la tabla - CONTINUO */}
            <tbody className="bg-white divide-y divide-gray-200">
              {data.categories.flatMap((category: EERRCategory, categoryIndex: number) => [
                // FILA DE CATEGORÍA (título con estilo especial)
                <tr key={`cat-${categoryIndex}`} className="bg-gradient-to-r from-indigo-100 to-indigo-50 border-t-2 border-indigo-300">
                  <td className="sticky left-0 z-20 px-6 py-3 text-sm font-bold text-indigo-900 uppercase tracking-wide bg-gradient-to-r from-indigo-100 to-indigo-50 shadow-lg">
                    {category.name}
                  </td>
                  <td
                    colSpan={(regularMonths.length * 2) + 3}
                    className="px-6 py-3 text-sm font-bold text-indigo-900 uppercase tracking-wide bg-gradient-to-r from-indigo-100 to-indigo-50"
                  >
                  </td>
                </tr>,

                // FILAS DE DATOS de la categoría
                ...category.rows.map((row: EERRRow, rowIndex: number) => (
                  <tr
                    key={`cat-${categoryIndex}-row-${rowIndex}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="sticky left-0 z-20 px-6 py-3 text-sm text-gray-900 whitespace-nowrap border-r border-gray-200 bg-white shadow-lg">
                      {row.Item}
                    </td>
                    {/* Meses normales (solo Monto y %) */}
                    {regularMonths.map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                          {row.Item === 'Ventas' && userId && sucursalName && data.monthToPeriod?.[month] ? (
                            <EditableCell
                              value={(() => {
                                const val = row[`${month} Monto`];
                                return typeof val === 'number' ? val : 0;
                              })()}
                              userId={userId}
                              periodo={data.monthToPeriod[month]}
                              sucursal={sucursalName}
                              cuenta="Ventas"
                              onValueChange={() => {
                                if (onDataRefresh) {
                                  onDataRefresh();
                                }
                              }}
                            />
                          ) : (
                            formatNumber(row[`${month} Monto`])
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                          {formatPercentage(row[`${month} %`])}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* Columna consolidada (Monto, %, Promedio) */}
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-indigo-50">
                      {formatNumber(row[`${consolidadoColumn} Monto`])}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-indigo-50">
                      {formatPercentage(row[`${consolidadoColumn} %`])}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-indigo-50">
                      {formatNumber(row[`${consolidadoColumn} Promedio`])}
                    </td>
                  </tr>
                )),

                // FILA DE TOTAL (si existe)
                ...(category.total ? [
                  <tr
                    key={`cat-${categoryIndex}-total`}
                    className="bg-indigo-50 font-semibold border-t-2 border-indigo-200"
                  >
                    <td className="sticky left-0 z-20 px-6 py-3 text-sm text-indigo-900 font-bold whitespace-nowrap border-r border-indigo-200 bg-indigo-50 shadow-lg">
                      {category.total.Item}
                    </td>
                    {/* Meses normales (solo Monto y %) */}
                    {regularMonths.map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        <td className="px-3 py-3 text-sm text-indigo-900 font-bold text-right whitespace-nowrap border-r border-indigo-100">
                          {formatNumber(category.total![`${month} Monto`])}
                        </td>
                        <td className="px-3 py-3 text-sm text-indigo-900 font-bold text-right whitespace-nowrap border-r border-indigo-100">
                          {formatPercentage(category.total![`${month} %`])}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* Columna consolidada (Monto, %, Promedio) */}
                    <td className="px-3 py-3 text-sm text-indigo-900 font-bold text-right whitespace-nowrap border-r border-indigo-100 bg-indigo-100">
                      {formatNumber(category.total![`${consolidadoColumn} Monto`])}
                    </td>
                    <td className="px-3 py-3 text-sm text-indigo-900 font-bold text-right whitespace-nowrap border-r border-indigo-100 bg-indigo-100">
                      {formatPercentage(category.total![`${consolidadoColumn} %`])}
                    </td>
                    <td className="px-3 py-3 text-sm text-indigo-900 font-bold text-right whitespace-nowrap border-r border-indigo-100 bg-indigo-100">
                      {formatNumber(category.total![`${consolidadoColumn} Promedio`])}
                    </td>
                  </tr>
                ] : [])
              ])}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
