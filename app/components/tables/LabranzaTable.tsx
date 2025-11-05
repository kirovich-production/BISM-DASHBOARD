'use client';

import React, { useState, useRef } from 'react';
import { EERRData, EERRCategory, EERRRow } from '@/types';

interface LabranzaTableProps {
  data: EERRData | null;
  periodLabel: string;
  version?: number;
  uploadedAt?: string | Date;
}

export default function LabranzaTable({ data, periodLabel, version, uploadedAt }: LabranzaTableProps) {
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
            No se encontraron datos de Sucursal Labranza para el período seleccionado.
          </p>
        </div>
      </div>
    );
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

  const generatePDF = async () => {
    if (!contentRef.current || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    console.log('🎯 Iniciando generación de PDF Labranza...');

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'fixed bottom-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-3';
    loadingDiv.innerHTML = `
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Generando PDF profesional...</span>
    `;
    document.body.appendChild(loadingDiv);

    try {
      console.log('📄 Intentando con Browserless.io...');
      
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

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sucursal Labranza - ${periodLabel}</title>
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
                padding: 12px;
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
                font-size: 8px !important;
                border-collapse: collapse !important;
                table-layout: auto !important;
              }
              
              th, td {
                padding: 4px 3px !important;
                border: 1px solid #d1d5db !important;
                text-align: center !important;
                white-space: nowrap !important;
                overflow: visible !important;
                font-size: 8px !important;
              }
              
              th {
                background-color: #16a34a !important;
                color: white !important;
                font-weight: 600 !important;
              }
              
              th:first-child,
              td:first-child {
                text-align: left !important;
                background: white !important;
                position: relative !important;
                min-width: 150px !important;
                max-width: 200px !important;
                width: 170px !important;
                font-size: 9px !important;
                padding: 5px 8px !important;
                word-wrap: break-word !important;
                white-space: normal !important;
                line-height: 1.3 !important;
                font-weight: 600 !important;
                border-right: 2px solid #16a34a !important;
              }
              
              th:first-child {
                background-color: #16a34a !important;
                color: white !important;
              }
              
              .bg-gradient-to-r {
                background: #dcfce7 !important;
              }
              
              .bg-green-50 {
                background-color: #f0fdf4 !important;
              }
              
              .bg-green-100 {
                background-color: #dcfce7 !important;
              }
              
              .text-green-900 {
                color: #14532d !important;
                font-weight: 700 !important;
              }
              
              .fixed, button, nav {
                display: none !important;
              }
              
              .sticky {
                position: relative !important;
                left: auto !important;
              }
              
              h1, h2, h3 {
                font-size: 12px !important;
                margin: 5px 0 !important;
                padding: 0 !important;
              }
              
              p {
                font-size: 9px !important;
                margin: 3px 0 !important;
              }
              
              span {
                font-size: 8px !important;
              }
              
              .border-b {
                border-bottom: 2px solid #e5e7eb !important;
                margin-bottom: 12px !important;
                padding-bottom: 8px !important;
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
          title: `sucursal-labranza-${periodLabel}`,
        }),
      });

      if (!response.ok) {
        // Si el servidor falla (503), intentar con fallback del cliente
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 503 || errorData.useClientFallback) {
          console.log('⚠️ Servidor no disponible, usando fallback del cliente...');
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
          pdf.save(`sucursal-labranza-${periodLabel}-${Date.now()}.pdf`);
          
          loadingDiv.remove();
          setIsGeneratingPdf(false);
          console.log('✅ PDF generado con método alternativo');
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sucursal-labranza-${periodLabel}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ PDF generado exitosamente');
      
      loadingDiv.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>PDF descargado exitosamente</span>
      `;
      
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
      loadingDiv.className = loadingDiv.className.replace('bg-green-600', 'bg-red-600');
      
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
            <h1 className="text-2xl font-bold text-green-900">Sucursal Labranza</h1>
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
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
            <thead className="bg-green-600 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-green-500">
                  Concepto
                </th>
                {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                  <th
                    key={monthIdx}
                    scope="col"
                    colSpan={2}
                    className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-green-500"
                  >
                    {month}
                  </th>
                ))}
                {/* CONSOLIDADO al final */}
                <th
                  scope="col"
                  colSpan={3}
                  className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-green-500 bg-green-700"
                >
                  CONSOLIDADO
                </th>
              </tr>
              <tr>
                <th scope="col" className="px-6 py-2 bg-green-700 border-r border-green-500"></th>
                {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                  <React.Fragment key={monthIdx}>
                    <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-700 border-r border-green-600">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-700 border-r border-green-600">
                      %
                    </th>
                  </React.Fragment>
                ))}
                {/* Sub-headers CONSOLIDADO */}
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-800 border-r border-green-600">
                  Monto
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-800 border-r border-green-600">
                  %
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-800 border-r border-green-600">
                  Promedio
                </th>
              </tr>
            </thead>

            {/* Body de la tabla - CONTINUO */}
            <tbody className="bg-white divide-y divide-gray-200">
              {data.categories.flatMap((category: EERRCategory, categoryIndex: number) => [
                // FILA DE CATEGORÍA (título con estilo especial)
                <tr key={`cat-${categoryIndex}`} className="bg-gradient-to-r from-green-100 to-green-50 border-t-2 border-green-300">
                  <td
                    colSpan={1 + (data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).length * 2) + 3}
                    className="px-6 py-3 text-sm font-bold text-green-900 uppercase tracking-wide"
                  >
                    {category.name}
                  </td>
                </tr>,

                // FILAS DE DATOS de la categoría
                ...category.rows.map((row: EERRRow, rowIndex: number) => (
                  <tr
                    key={`cat-${categoryIndex}-row-${rowIndex}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap border-r border-gray-200">
                      {row.Item}
                    </td>
                    {/* Meses normales (solo Monto y %) */}
                    {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                          {formatNumber(row[`${month} Monto`])}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                          {formatPercentage(row[`${month} %`])}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* CONSOLIDADO (Monto, %, Promedio) */}
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-green-50">
                      {formatNumber(row['CONSOLIDADO Monto'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-green-50">
                      {formatPercentage(row['CONSOLIDADO %'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-green-50">
                      {formatNumber(row['CONSOLIDADO Promedio'])}
                    </td>
                  </tr>
                )),

                // FILA DE TOTAL (si existe)
                ...(category.total ? [
                  <tr
                    key={`cat-${categoryIndex}-total`}
                    className="bg-green-50 font-semibold border-t-2 border-green-200"
                  >
                    <td className="px-6 py-3 text-sm text-green-900 font-bold whitespace-nowrap border-r border-green-200">
                      {category.total.Item}
                    </td>
                    {/* Meses normales (solo Monto y %) */}
                    {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100">
                          {formatNumber(category.total![`${month} Monto`])}
                        </td>
                        <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100">
                          {formatPercentage(category.total![`${month} %`])}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* CONSOLIDADO (Monto, %, Promedio) */}
                    <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100 bg-green-100">
                      {formatNumber(category.total!['CONSOLIDADO Monto'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100 bg-green-100">
                      {formatPercentage(category.total!['CONSOLIDADO %'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100 bg-green-100">
                      {formatNumber(category.total!['CONSOLIDADO Promedio'])}
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
