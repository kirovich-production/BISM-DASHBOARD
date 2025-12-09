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

  // Formato compacto para PDF (cuando hay muchas columnas)
  const formatNumberCompact = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    let num: number;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '').trim();
      num = parseFloat(cleaned);
    } else {
      num = value;
    }
    
    if (isNaN(num)) return '-';
    
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`; // Billones
    } else if (absNum >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`; // Millones
    } else if (absNum >= 1000) {
      return `${Math.round(num / 1000)}K`; // Miles
    }
    return num.toString();
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

  // Formato compacto para porcentajes en PDF
  const formatPercentageCompact = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    let num: number;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[%\s]/g, '').trim();
      num = parseFloat(cleaned);
    } else {
      num = value;
    }
    
    if (isNaN(num)) return '-';
    return `${num.toFixed(1)}%`; // Solo 1 decimal para PDF
  };

  // Detectar si existe CONSOLIDADO o ANUAL
  const consolidadoColumn = data.months.find(m => m.toUpperCase().includes('CONSOLIDADO') || m.toUpperCase().includes('ANUAL')) || 'CONSOLIDADO';
  const regularMonths = data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO') && !m.toUpperCase().includes('ANUAL'));

  // Calcular estilos dinámicos basados en cantidad de columnas
  const totalColumns = (regularMonths.length * 2) + 3;
  let pdfStyles = {
    itemColumnWidth: '170px',
    itemColumnFontSize: '9px',
    itemColumnPadding: '5px 8px',
    numericColumnWidth: 'auto',
    numericFontSize: '8px',
    numericPadding: '4px 3px',
    headerFontSize: '8px',
    useCompactFormat: false,
  };

  if (totalColumns <= 9) { // Hasta 3 meses
    pdfStyles = {
      itemColumnWidth: '170px',
      itemColumnFontSize: '9px',
      itemColumnPadding: '5px 8px',
      numericColumnWidth: 'auto',
      numericFontSize: '8px',
      numericPadding: '4px 3px',
      headerFontSize: '8px',
      useCompactFormat: false,
    };
  } else if (totalColumns <= 15) { // 4-6 meses
    pdfStyles = {
      itemColumnWidth: '140px',
      itemColumnFontSize: '8px',
      itemColumnPadding: '4px 6px',
      numericColumnWidth: '48px',
      numericFontSize: '7px',
      numericPadding: '3px 2px',
      headerFontSize: '7px',
      useCompactFormat: false,
    };
  } else if (totalColumns <= 21) { // 7-9 meses
    pdfStyles = {
      itemColumnWidth: '110px',
      itemColumnFontSize: '7px',
      itemColumnPadding: '3px 5px',
      numericColumnWidth: '40px',
      numericFontSize: '6px',
      numericPadding: '2px 2px',
      headerFontSize: '6px',
      useCompactFormat: true,
    };
  } else { // 10-12 meses
    pdfStyles = {
      itemColumnWidth: '85px',
      itemColumnFontSize: '6.5px',
      itemColumnPadding: '2px 4px',
      numericColumnWidth: '32px',
      numericFontSize: '5.5px',
      numericPadding: '2px 1px',
      headerFontSize: '5.5px',
      useCompactFormat: true,
    };
  }

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
      
      const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;

      stickyElements.forEach(el => {
        (el as HTMLElement).style.position = 'sticky';
      });
      scrollContainers.forEach((container, index) => {
        container.scrollLeft = originalScrollPositions[index];
      });

      // Aplicar formato compacto si es necesario
      if (pdfStyles.useCompactFormat) {
        // Reemplazar valores numéricos con formato compacto en el clon
        const numericCells = clonedContent.querySelectorAll('td:not(:first-child)');
        numericCells.forEach(cell => {
          const text = cell.textContent?.trim() || '';
          // Si es un porcentaje
          if (text.includes('%') && text !== '-') {
            const cleaned = text.replace(/[%\s]/g, '');
            const num = parseFloat(cleaned);
            if (!isNaN(num)) {
              cell.textContent = formatPercentageCompact(num);
            }
          }
          // Si es un número con formato de moneda
          else if (text.includes('$') && text !== '-') {
            const cleaned = text.replace(/[$,\s]/g, '');
            const num = parseFloat(cleaned);
            if (!isNaN(num)) {
              cell.textContent = formatNumberCompact(num);
            }
          }
        });
      }

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
                margin: 0;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              html {
                width: 297mm;
                height: 210mm;
              }
              
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: white;
                padding: 10px;
                width: 297mm;
                max-width: 297mm;
                min-height: 210mm;
              }
              
              .flex-1 {
                width: 100% !important;
                max-width: 100% !important;
              }
              
              table {
                width: 100% !important;
                max-width: 100% !important;
                font-size: ${pdfStyles.numericFontSize} !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
              }
              
              th, td {
                padding: ${pdfStyles.numericPadding} !important;
                border: 1px solid #d1d5db !important;
                text-align: center !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                font-size: ${pdfStyles.numericFontSize} !important;
              }
              
              th {
                background-color: #4f46e5 !important;
                color: white !important;
                font-weight: 600 !important;
                font-size: ${pdfStyles.headerFontSize} !important;
              }
              
              th:not(:first-child),
              td:not(:first-child) {
                width: ${pdfStyles.numericColumnWidth} !important;
                max-width: ${pdfStyles.numericColumnWidth} !important;
              }
              
              th:first-child,
              td:first-child {
                text-align: left !important;
                background: white !important;
                position: relative !important;
                width: ${pdfStyles.itemColumnWidth} !important;
                max-width: ${pdfStyles.itemColumnWidth} !important;
                font-size: ${pdfStyles.itemColumnFontSize} !important;
                padding: ${pdfStyles.itemColumnPadding} !important;
                word-wrap: break-word !important;
                white-space: normal !important;
                line-height: 1.2 !important;
                font-weight: 600 !important;
                border-right: 2px solid #4f46e5 !important;
              }
              
              th:first-child {
                background-color: #4f46e5 !important;
                color: white !important;
              }
              
              .bg-gradient-to-r {
                background: #e0e7ff !important;
              }
              
              .bg-indigo-50 {
                background-color: #eef2ff !important;
              }
              
              .bg-indigo-100 {
                background-color: #e0e7ff !important;
              }
              
              .text-indigo-900 {
                color: #312e81 !important;
                font-weight: 700 !important;
              }
              
              .fixed, button, nav {
                display: none !important;
              }
              
              .sticky {
                position: relative !important;
                left: auto !important;
              }
              
              h1 {
                font-size: 14px !important;
                margin: 4px 0 !important;
                padding: 0 !important;
              }
              
              p {
                font-size: 8px !important;
                margin: 2px 0 !important;
              }
              
              .border-b {
                border-bottom: 2px solid #e5e7eb !important;
                margin-bottom: 8px !important;
                padding-bottom: 6px !important;
              }
            </style>
          </head>
          <body>
            ${clonedContent.outerHTML}
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
