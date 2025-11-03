'use client';

import { useState, useRef } from 'react';
import TabNavigation from './TabNavigation';
import DataTable from './DataTable';
import TableViewControls from './TableViewControls';
import type { ExcelRow } from '@/types';

interface TableViewProps {
  sections: Array<{ name: string; data: ExcelRow[] }>;
  periodLabel: string;
  version?: number;
  uploadedAt?: string | Date;
}

export default function TableView({ sections, periodLabel, version, uploadedAt }: TableViewProps) {
  const [activeTab, setActiveTab] = useState<'Labranza' | 'Sevilla' | 'Consolidados'>('Labranza');
  const [tableVisibleMonths, setTableVisibleMonths] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Manejar cambio de vista de tabla
  const handleTableViewChange = (mode: 'all' | 'quarter' | 'comparison', data: { quarter?: string; month1?: string; month2?: string }) => {
    const MONTHS = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (mode === 'all') {
      setTableVisibleMonths(MONTHS);
    } else if (mode === 'quarter' && data.quarter) {
      const quarters = {
        'Q1': ['Enero', 'Febrero', 'Marzo'],
        'Q2': ['Abril', 'Mayo', 'Junio'],
        'Q3': ['Julio', 'Agosto', 'Septiembre'],
        'Q4': ['Octubre', 'Noviembre', 'Diciembre']
      };
      setTableVisibleMonths(quarters[data.quarter as keyof typeof quarters] || []);
    } else if (mode === 'comparison' && data.month1 && data.month2) {
      setTableVisibleMonths([data.month1, data.month2]);
    }
  };

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
      
      const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tablas Financieras - ${periodLabel}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: white;
                padding: 20px;
                width: 100%;
              }
              
              /* Contenedor principal */
              .flex-1 {
                width: 100% !important;
                max-width: 100% !important;
              }
              
              /* Tablas responsive */
              table {
                width: 100% !important;
                font-size: 9px !important;
                border-collapse: collapse !important;
              }
              
              th, td {
                padding: 4px 2px !important;
                border: 1px solid #d1d5db !important;
                text-align: center !important;
                white-space: nowrap !important;
              }
              
              th {
                background-color: #4f46e5 !important;
                color: white !important;
                font-weight: 600 !important;
              }
              
              /* Primera columna pegada a la izquierda */
              th:first-child,
              td:first-child {
                text-align: left !important;
                position: sticky !important;
                left: 0 !important;
                background: inherit !important;
                z-index: 1 !important;
              }
              
              /* Totales en negrita */
              tr:has(strong) td {
                font-weight: 700 !important;
                background-color: #f3f4f6 !important;
              }
              
              /* Ocultar controles y navegación */
              .fixed, button, .sticky, nav {
                display: none !important;
              }
              
              /* Encabezados compactos */
              h2, h3 {
                font-size: 12px !important;
                margin: 8px 0 !important;
              }
              
              p {
                font-size: 10px !important;
                margin: 4px 0 !important;
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
          unit: 'px',
          format: [contentRef.current.scrollWidth, contentRef.current.scrollHeight],
        });

        pdf.addImage(
          dataUrl,
          'PNG',
          0,
          0,
          contentRef.current.scrollWidth,
          contentRef.current.scrollHeight
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

  // Obtener datos de la sección activa
  const activeSection = sections.find(s => s.name === activeTab);

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8" ref={contentRef}>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">
            Período: <strong>{periodLabel}</strong>
          </p>
          {version && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
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

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Controles de filtrado de tabla */}
      <div className="mb-6">
        <TableViewControls onViewChange={handleTableViewChange} />
      </div>

      <DataTable 
        data={activeSection?.data || []} 
        sectionName={activeTab}
        visibleMonths={tableVisibleMonths}
      />
    </div>
  );
}
