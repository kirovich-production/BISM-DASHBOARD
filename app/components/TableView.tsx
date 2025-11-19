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
  const [selectedTab, setSelectedTab] = useState<'consolidados' | 'sevilla' | 'labranza'>('consolidados');
  const contentRef = useRef<HTMLDivElement>(null);

  // Función auxiliar para generar contenido HTML de cada página (sin estructura completa)
  const generatePageContent = (
    data: ExcelRow[],
    visibleMonths: string[],
    pageTitle: string,
    includeAnual: boolean = false,
    year?: number
  ): string => {
    // Crear tabla HTML manualmente
    const formatValue = (value: unknown, isPercentage: boolean = false): string => {
      if (value === null || value === undefined || value === '') return '-';
      if (typeof value === 'number') {
        if (isPercentage) {
          return new Intl.NumberFormat('es-CL', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value / 100);
        }
        return new Intl.NumberFormat('es-CL').format(value);
      }
      return String(value);
    };

    // Crear headers de dos niveles como en la tabla original
    // Primera fila de headers (nombres de meses) - Color principal
    const headerRow1Cells = ['<th rowspan="2" style="background-color: #1e40af !important; color: #ffffff !important; border: 1px solid #ffffff !important; border-right: 2px solid #ffffff !important; text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px; vertical-align: middle;">Item</th>'];
    
    visibleMonths.forEach((month, index) => {
      const borderStyle = index < visibleMonths.length - 1 || includeAnual ? 'border-right: 2px solid #ffffff !important;' : '';
      headerRow1Cells.push(`<th colspan="2" style="background-color: #1e40af !important; color: #ffffff !important; border: 1px solid #ffffff !important; ${borderStyle} text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px;">${month}</th>`);
    });
    
    if (includeAnual) {
      headerRow1Cells.push(`<th colspan="3" style="background-color: #1e40af !important; color: #ffffff !important; border: 1px solid #ffffff !important; text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px;">ANUAL</th>`);
    }
    
    const headerRow1 = headerRow1Cells.join('');
    
    // Segunda fila de headers (Monto y %) - Color más claro
    const headerRow2Cells = [];
    visibleMonths.forEach((month, monthIndex) => {
      const isLastMonth = monthIndex === visibleMonths.length - 1 && !includeAnual;
      headerRow2Cells.push(`<th style="background-color: #3b82f6 !important; color: #ffffff !important; border: 1px solid #ffffff !important; text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px;">Monto</th>`);
      headerRow2Cells.push(`<th style="background-color: #3b82f6 !important; color: #ffffff !important; border: 1px solid #ffffff !important; ${isLastMonth ? '' : 'border-right: 2px solid #ffffff !important;'} text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px;">%</th>`);
    });
    
    if (includeAnual) {
      headerRow2Cells.push(`<th style="background-color: #3b82f6 !important; color: #ffffff !important; border: 1px solid #ffffff !important; text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px;">Monto</th>`);
      headerRow2Cells.push(`<th style="background-color: #3b82f6 !important; color: #ffffff !important; border: 1px solid #ffffff !important; text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px;">%</th>`);
      headerRow2Cells.push(`<th style="background-color: #3b82f6 !important; color: #ffffff !important; border: 1px solid #ffffff !important; text-align: center; font-weight: 600; font-size: 9px; padding: 8px 4px;">Promedio</th>`);
    }
    
    const headerRow2 = headerRow2Cells.join('');

    // Crear filas de datos
    const tableRows = data.map((row, index) => {
      const isEven = index % 2 === 1;
      const cells = [`<td class="item-column" style="background-color: ${isEven ? '#f1f5f9' : '#f8fafc'} !important; border: 1px solid #d1d5db !important; font-weight: 500;">${formatValue(row.Item)}</td>`];
      
      // Agregar celdas de meses (Monto y %)
      visibleMonths.forEach(month => {
        const monthMonto = `${month} Monto`;
        const monthPercent = `${month} %`;
        const montoValue = (row as Record<string, unknown>)[monthMonto];
        const percentValue = (row as Record<string, unknown>)[monthPercent];
        
        cells.push(`<td class="number-cell" style="background-color: ${isEven ? '#f1f5f9' : '#ffffff'} !important; border: 1px solid #d1d5db !important;">${formatValue(montoValue)}</td>`);
        cells.push(`<td class="number-cell" style="background-color: ${isEven ? '#f1f5f9' : '#ffffff'} !important; border: 1px solid #d1d5db !important;">${formatValue(percentValue, true)}</td>`);
      });
      
      // Agregar columna Anual si se requiere (Monto, % y Promedio)
      if (includeAnual) {
        const anualMonto = (row as Record<string, unknown>)['ANUAL Monto'];
        const anualPercent = (row as Record<string, unknown>)['ANUAL %'];
        const anualPromedio = (row as Record<string, unknown>)['ANUAL Promedio'];
        
        cells.push(`<td class="number-cell" style="background-color: ${isEven ? '#f1f5f9' : '#ffffff'} !important; border: 1px solid #d1d5db !important;">${formatValue(anualMonto)}</td>`);
        cells.push(`<td class="number-cell" style="background-color: ${isEven ? '#f1f5f9' : '#ffffff'} !important; border: 1px solid #d1d5db !important;">${formatValue(anualPercent, true)}</td>`);
        cells.push(`<td class="number-cell" style="background-color: ${isEven ? '#f1f5f9' : '#ffffff'} !important; border: 1px solid #d1d5db !important;">${formatValue(anualPromedio)}</td>`);
      }
      
      return `<tr>${cells.join('')}</tr>`;
    }).join('');





    return `
      <div style="margin-bottom: 30px;">
        <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
          <h1 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 15px;">
            Reporte Consolidado - ${year || new Date().getFullYear()}
          </h1>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr>${headerRow1}</tr>
            <tr>${headerRow2}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        
      </div>
    `;
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
      <span>Generando PDF</span>
    `;
    document.body.appendChild(loadingDiv);

    try {
      
      // Obtener datos de consolidado
      if (!activeSection?.data) {
        throw new Error(`No hay datos de ${selectedTab} para PDF`);
      }





      // Generar contenido HTML para cada página (sin estructura completa)
      const sectionTitle = selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1);
      
      const page1Content = generatePageContent(
        activeSection.data,
        ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
        `${sectionTitle} - Página 1 de 2 - Enero a Junio`,
        false, // no incluir Anual
        new Date().getFullYear()
      );

      const page2Content = generatePageContent(
        activeSection.data,
        ['Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        `${sectionTitle} - Página 2 de 2 - Julio a Diciembre + Anual`,
        true, // incluir columna Anual
        new Date().getFullYear()
      );

      // Generar PDF multi-página usando la nueva API route
      const response = await fetch('/api/generate-pdf-multipage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: [page1Content, page2Content]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error generando PDF: ${response.status} - ${errorData.error}`);
      }

      // Obtener el PDF como ArrayBuffer
      const pdfBuffer = await response.arrayBuffer();

      // Descargar el PDF combinado
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const sectionName = selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1);
      link.download = `${sectionName}_${periodLabel}_MultiPagina.pdf`;
      link.click();
      
      window.URL.revokeObjectURL(url);


    } catch (error) {
      console.error('❌ Error generando PDF con Browserless.io:', error);
      
      // Método de respaldo con jsPDF
      try {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;

        const canvas = await html2canvas(contentRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: contentRef.current.scrollWidth,
          height: contentRef.current.scrollHeight
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight);
        const sectionName = selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1);
        pdf.save(`${sectionName}_${periodLabel}_Respaldo.pdf`);


      } catch (fallbackError) {
        console.error('❌ Error con método de respaldo:', fallbackError);
        alert('Error generando PDF. Por favor, inténtalo de nuevo.');
      }
    } finally {
      document.body.removeChild(loadingDiv);
      setIsGeneratingPdf(false);
    }
  };

  // Obtener la sección activa según la pestaña seleccionada
  const activeSection = sections.find(s => {
    const sectionName = s.name.toLowerCase();
    if (selectedTab === 'consolidados') return sectionName === 'consolidados';
    if (selectedTab === 'sevilla') return sectionName === 'sevilla';
    if (selectedTab === 'labranza') return sectionName === 'labranza';
    return false;
  });

  // Verificar qué secciones están disponibles
  const hasConsolidados = sections.some(s => s.name.toLowerCase() === 'consolidados');
  const hasSevilla = sections.some(s => s.name.toLowerCase() === 'sevilla');
  const hasLabranza = sections.some(s => s.name.toLowerCase() === 'labranza');

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
              <h2 className="text-lg font-bold text-gray-900">
                Consolidado - {selectedTab === 'consolidados' ? 'Consolidados' : selectedTab === 'sevilla' ? 'Sevilla' : 'Labranza'}
              </h2>
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

      {/* Pestañas de secciones */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTab('consolidados')}
            disabled={!hasConsolidados}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedTab === 'consolidados'
                ? 'bg-purple-600 text-white shadow-md'
                : hasConsolidados
                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>📊</span>
            <span>Consolidados</span>
            {hasConsolidados && sections.find(s => s.name.toLowerCase() === 'consolidados')?.data.length && (
              <span className="text-xs opacity-75">({sections.find(s => s.name.toLowerCase() === 'consolidados')?.data.length})</span>
            )}
          </button>
          
          <button
            onClick={() => setSelectedTab('sevilla')}
            disabled={!hasSevilla}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedTab === 'sevilla'
                ? 'bg-purple-600 text-white shadow-md'
                : hasSevilla
                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>🏭</span>
            <span>Sevilla</span>
            {hasSevilla && sections.find(s => s.name.toLowerCase() === 'sevilla')?.data.length && (
              <span className="text-xs opacity-75">({sections.find(s => s.name.toLowerCase() === 'sevilla')?.data.length})</span>
            )}
          </button>
          
          <button
            onClick={() => setSelectedTab('labranza')}
            disabled={!hasLabranza}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedTab === 'labranza'
                ? 'bg-purple-600 text-white shadow-md'
                : hasLabranza
                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>🌾</span>
            <span>Labranza</span>
            {hasLabranza && sections.find(s => s.name.toLowerCase() === 'labranza')?.data.length && (
              <span className="text-xs opacity-75">({sections.find(s => s.name.toLowerCase() === 'labranza')?.data.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Tabla */}
      {activeSection?.data ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <DataTable 
            data={activeSection.data}
            sectionName={activeSection.name}
          />
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Sin datos de {selectedTab}</h3>
              <p className="text-sm text-yellow-700">
                No se encontraron datos para la sección de {selectedTab === 'consolidados' ? 'Consolidados' : selectedTab === 'sevilla' ? 'Sevilla' : 'Labranza'} en este período.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}