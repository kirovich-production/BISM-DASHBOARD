'use client';

import { useState, useRef } from 'react';
import DataTable from './DataTable';
import type { ExcelRow } from '@/types';

interface TableViewProps {
  sections: Array<{ name: string; data: ExcelRow[] }>;
  periodLabel: string;
  version?: number;
  uploadedAt?: string | Date;
}

export default function TableView({ sections, periodLabel, version, uploadedAt }: TableViewProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!contentRef.current || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    console.log('🎯 Iniciando generación de PDF de tablas...');

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
      console.log('📄 Método 1: Intentando con Browserless.io (producción)...');
      
      // CRÍTICO: Preparar tabla para captura
      // 1. Forzar scroll a la izquierda para capturar columna sticky
      const scrollContainers = contentRef.current.querySelectorAll('.overflow-x-auto');
      const originalScrollPositions: number[] = [];
      scrollContainers.forEach((container, index) => {
        originalScrollPositions[index] = container.scrollLeft;
        container.scrollLeft = 0; // Forzar scroll al inicio
      });

      // 2. Remover temporalmente sticky de la columna Ítem para PDF
      const stickyElements = contentRef.current.querySelectorAll('.sticky');
      stickyElements.forEach(el => {
        (el as HTMLElement).style.position = 'relative';
      });

      // 3. Esperar un momento para que se renderice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;

      // 4. Restaurar sticky para la vista web
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
            <title>Tablas Financieras - ${periodLabel}</title>
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
              
              /* Contenedor principal */
              .flex-1 {
                width: 100% !important;
                max-width: 100% !important;
              }
              
              /* Tablas responsive */
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
                background-color: #4f46e5 !important;
                color: white !important;
                font-weight: 600 !important;
              }
              
              /* Primera columna pegada a la izquierda - SIEMPRE VISIBLE */
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
                border-right: 2px solid #4f46e5 !important;
              }
              
              /* Header de primera columna */
              th:first-child {
                background-color: #4f46e5 !important;
                color: white !important;
              }
              
              /* Totales en negrita */
              tr:has(strong) td {
                font-weight: 700 !important;
                background-color: #f3f4f6 !important;
              }
              
              /* Ocultar controles y navegación */
              .fixed, button, nav {
                display: none !important;
              }
              
              /* Eliminar sticky en PDF - ya está capturado en la posición correcta */
              .sticky {
                position: relative !important;
                left: auto !important;
              }
              
              /* Encabezados compactos */
              h2, h3 {
                font-size: 12px !important;
                margin: 5px 0 !important;
                padding: 0 !important;
              }
              
              p {
                font-size: 9px !important;
                margin: 3px 0 !important;
              }
              
              /* Span pequeño */
              span {
                font-size: 8px !important;
              }
              
              /* Border del contenedor */
              .border-b {
                border-bottom: 2px solid #e5e7eb !important;
                margin-bottom: 12px !important;
                padding-bottom: 8px !important;
              }
              
              /* Espacio entre tabs */
              .mb-6 {
                margin-bottom: 12px !important;
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
          title: `tablas-financieras-${periodLabel.replace(/\s+/g, '-')}`,
        }),
      });

      if (response.ok && response.headers.get('Content-Type')?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tablas-financieras-${periodLabel.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);

        document.body.removeChild(loadingDiv);

        const successDiv = document.createElement('div');
        successDiv.className = 'fixed bottom-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999]';
        successDiv.innerHTML = '✓ PDF generado con Browserless.io (calidad profesional)';
        document.body.appendChild(successDiv);
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
          }
        }, 3000);

        console.log('✅ PDF generado con Browserless.io exitosamente');
        setIsGeneratingPdf(false);
        return;
      }

      console.warn('⚠️ Browserless no disponible, usando fallback dom-to-image...');
      throw new Error('Browserless not available, using fallback');

    } catch {
      console.log('🔄 Usando método de fallback (dom-to-image)...');
      
      try {
        // FALLBACK: Usar dom-to-image-more
        // @ts-expect-error - dom-to-image-more no tiene tipos oficiales
        const domtoimage = (await import('dom-to-image-more')).default;
        const jsPDF = (await import('jspdf')).default;

        const dataUrl = await domtoimage.toPng(contentRef.current, {
          quality: 1.0,
          width: contentRef.current.scrollWidth,
          height: contentRef.current.scrollHeight,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
          },
        });

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = contentRef.current.scrollWidth;
        const imgHeight = contentRef.current.scrollHeight;
        
        // Calcular escala para ajustar al ancho de la página
        const scale = pdfWidth / (imgWidth * 0.264583); // Convertir px a mm
        const scaledWidth = pdfWidth;
        const scaledHeight = (imgHeight * 0.264583) * scale;

        pdf.addImage(
          dataUrl,
          'PNG',
          0,
          0,
          scaledWidth,
          scaledHeight > pdfHeight ? pdfHeight : scaledHeight
        );
        pdf.save(`tablas-financieras-${periodLabel.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);

        document.body.removeChild(loadingDiv);

        const successDiv = document.createElement('div');
        successDiv.className = 'fixed bottom-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999]';
        successDiv.innerHTML = '✓ PDF generado (método alternativo)';
        document.body.appendChild(successDiv);
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
          }
        }, 3000);

        console.log('✅ PDF generado con dom-to-image exitosamente');
      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError);
        document.body.removeChild(loadingDiv);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed bottom-20 right-6 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999]';
        errorDiv.innerHTML = '✗ Error al generar PDF';
        document.body.appendChild(errorDiv);
        setTimeout(() => {
          if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
          }
        }, 3000);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Obtener datos de la sección "Consolidados" únicamente
  const consolidadosSection = sections.find(s => s.name === 'Consolidados');

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8" ref={contentRef}>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Consolidado</h2>
              <p className="text-sm text-gray-600">
                Período: <strong>{periodLabel}</strong>
              </p>
            </div>
          </div>
          {version && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              Versión {version}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {uploadedAt && (
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Cargado: {new Date(uploadedAt).toLocaleString('es-CL')}
              </p>
            </div>
          )}
          
          {/* Botón PDF */}
          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isGeneratingPdf ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <DataTable 
        data={consolidadosSection?.data || []} 
        sectionName="Consolidado"
      />
    </div>
  );
}
