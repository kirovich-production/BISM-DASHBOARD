'use client';

import { useRef } from 'react';
import GraphSidebar from './GraphSidebar';
import ChartContainer from './charts/ChartContainer';
import SalesAccumulatedChart from './charts/SalesAccumulatedChart';
import SalesDistributionChart from './charts/SalesDistributionChart';
import SalesLabranzaMonthlyChart from './charts/SalesLabranzaMonthlyChart';
import SalesSevillaMonthlyChart from './charts/SalesSevillaMonthlyChart';
import SalesConsolidadoMonthlyChart from './charts/SalesConsolidadoMonthlyChart';
import { useChartData } from './charts/useChartData';
import { useMonthlySalesData } from './charts/useMonthlySalesData';
import type { ExcelRow } from '@/types';

interface GraphViewProps {
  selectedPeriod: string | null;
  onPeriodChange: (period: string) => void;
  availablePeriods: string[];
  sections: { name: string; data: ExcelRow[] }[];
}

export default function GraphView({
  selectedPeriod,
  onPeriodChange,
  availablePeriods,
  sections,
}: GraphViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const chartData = useChartData(sections);
  
  // Hook para datos mensuales
  const {
    monthlyData,
    quarterOptions,
    monthOptions,
    filterByQuarter,
    filterByComparison,
  } = useMonthlySalesData(chartData);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
    loadingDiv.innerHTML = '<div class="bg-white p-6 rounded-lg"><div class="flex items-center gap-3"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div><p class="text-lg font-semibold">Generando PDF de alta calidad...</p></div></div>';
    document.body.appendChild(loadingDiv);

    try {
      console.log('🎯 [v3.0-browserless] Generando PDF con Browserless.io...');
      
      // PASO 1: Intentar con Browserless.io (servidor)
      // Primero, convertir los canvas ORIGINALES a imágenes (antes de clonar)
      const originalCanvases = contentRef.current.querySelectorAll('canvas');
      console.log(`📊 Encontrados ${originalCanvases.length} canvas en el DOM original`);
      
      // Crear mapa de canvas -> imagen data URL
      const canvasImages = new Map<HTMLCanvasElement, string>();
      originalCanvases.forEach((canvas) => {
        const htmlCanvas = canvas as HTMLCanvasElement;
        try {
          const dataUrl = htmlCanvas.toDataURL('image/png');
          canvasImages.set(htmlCanvas, dataUrl);
          console.log(`✓ Canvas convertido: ${dataUrl.substring(0, 50)}...`);
        } catch (error) {
          console.error('Error convirtiendo canvas:', error);
        }
      });

      // Ahora clonar el contenido
      const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;
      
      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            return '';
          }
        })
        .join('\n');

      // Reemplazar los canvas clonados (vacíos) con imágenes
      const clonedCanvases = clonedContent.querySelectorAll('canvas');
      console.log(`📊 Reemplazando ${clonedCanvases.length} canvas clonados con imágenes...`);
      
      clonedCanvases.forEach((clonedCanvas, index) => {
        const originalCanvas = Array.from(originalCanvases)[index] as HTMLCanvasElement;
        const dataUrl = canvasImages.get(originalCanvas);
        
        if (dataUrl && clonedCanvas.parentNode) {
          // Crear elemento img con la imagen del canvas original
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          
          // Reemplazar canvas clonado con img
          clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
          console.log(`✓ Canvas ${index + 1} reemplazado con imagen`);
        } else {
          console.warn(`⚠️ No se pudo obtener imagen para canvas ${index + 1}`);
        }
      });

      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              ${styles}
              
              /* Reset básico */
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              body {
                margin: 0;
                padding: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: white;
                width: 100%;
                max-width: 100%;
                overflow-x: hidden;
              }
              
              /* Contenedor principal */
              .space-y-6, .space-y-8 {
                display: flex;
                flex-direction: column;
                gap: 20px;
                width: 100%;
              }
              
              /* Grid de gráficos - 2 columnas optimizadas */
              .grid-cols-1.md\\:grid-cols-2, .grid-cols-1.lg\\:grid-cols-2 {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 12px !important;
                width: 100%;
                page-break-inside: avoid !important;
              }
              
              /* Contenedores de gráficos */
              .bg-white.rounded-lg.shadow-md {
                padding: 12px !important;
                margin-bottom: 12px !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: flex;
                flex-direction: column;
                width: 100%;
              }
              
              /* Canvas/imágenes con altura controlada */
              .bg-white.rounded-lg.shadow-md > div {
                width: 100% !important;
                height: 280px !important;
                position: relative !important;
              }
              
              /* Imágenes de canvas */
              img {
                max-width: 100% !important;
                max-height: 100% !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
                display: block !important;
                margin: 0 auto !important;
              }
              
              /* Títulos compactos */
              h3 {
                font-size: 14px !important;
                margin: 0 0 8px 0 !important;
                padding: 0 !important;
              }
              
              /* Ocultar elementos de navegación */
              .fixed, button, .sticky {
                display: none !important;
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
          title: `graficos-ventas-${selectedPeriod || 'reporte'}`,
        }),
      });

      if (response.ok && response.headers.get('Content-Type')?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `graficos-ventas-${selectedPeriod || 'reporte'}-${new Date().toISOString().split('T')[0]}.pdf`;
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
        return;
      }

      console.warn('⚠️ Browserless no disponible, usando fallback dom-to-image...');
      console.warn('Response status:', response.status);
      const errorData = await response.json().catch(() => ({}));
      console.warn('Error data:', errorData);
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
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const img = new Image();
        img.src = dataUrl;
        
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const imgWidth = pdfWidth - 20;
        const imgHeight = (img.height * imgWidth) / img.width;
        
        let heightLeft = imgHeight;
        let position = 10;

        pdf.addImage(dataUrl, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);

        while (heightLeft > 0) {
          position = heightLeft - imgHeight + 10;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= (pdfHeight - 20);
        }

        pdf.save(`graficos-ventas-${selectedPeriod || 'reporte'}-${new Date().toISOString().split('T')[0]}.pdf`);
        
        document.body.removeChild(loadingDiv);
        
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed bottom-20 right-6 bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999]';
        successDiv.innerHTML = '✓ PDF generado (modo compatibilidad)';
        document.body.appendChild(successDiv);
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
          }
        }, 3000);

        console.log('✅ PDF generado con fallback dom-to-image');

      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError);
        const loadingDivs = document.querySelectorAll('.fixed.inset-0');
        loadingDivs.forEach(div => div.remove());
        
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Error desconocido';
        alert(`Error al generar el PDF:\n${errorMessage}\n\nRevisa la consola para más detalles.`);
      }
    }
  };

  // Calcular totales para el gráfico circular
  const parseMoneyString = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const labranzaSection = sections.find(s => s.name === 'Labranza');
  const sevillaSection = sections.find(s => s.name === 'Sevilla');

  const labranzaTotal = labranzaSection
    ? parseMoneyString(
        labranzaSection.data.find(row => 
          String(row['Item'] || '').toLowerCase().trim().includes('venta') && 
          String(row['Item'] || '').toLowerCase().trim().includes('neta')
        )?.['ANUAL Monto']
      )
    : 0;

  const sevillaTotal = sevillaSection
    ? parseMoneyString(
        sevillaSection.data.find(row => 
          String(row['Item'] || '').toLowerCase().trim().includes('venta') && 
          String(row['Item'] || '').toLowerCase().trim().includes('neta')
        )?.['ANUAL Monto']
      )
    : 0;

  return (
    <div className="flex h-full bg-gray-50">
      <GraphSidebar
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        availablePeriods={availablePeriods}
      />
      
      <div className="flex-1 overflow-auto p-4 md:p-6 xl:p-8">
        {/* Botón de exportar PDF - fijo en la esquina */}
        {selectedPeriod && sections.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 md:px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline font-medium">Exportar PDF</span>
              <span className="sm:hidden font-medium">PDF</span>
            </button>
          </div>
        )}
        
        <div ref={contentRef}>
        {!selectedPeriod ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecciona un período
              </h3>
              <p className="text-sm text-gray-500">
                Elige un período del sidebar para visualizar los gráficos
              </p>
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-yellow-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay datos disponibles
              </h3>
              <p className="text-sm text-gray-500">
                No se encontraron datos para el período seleccionado
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Grid de gráficos lado a lado (50/50) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 2xl:gap-8">
              {/* Gráfico de Ventas Acumuladas */}
              <ChartContainer title="Ventas Netas Acumuladas">
                <SalesAccumulatedChart data={chartData} />
              </ChartContainer>

              {/* Gráfico de Distribución - más grande */}
              <ChartContainer
                title="Distribución de Ventas"
                className="h-full min-h-[600px] md:min-h-[700px] lg:min-h-[750px]"
              >
                <SalesDistributionChart 
                  labranzaTotal={labranzaTotal}
                  sevillaTotal={sevillaTotal}
                />
              </ChartContainer>
            </div>

            {/* Nuevos gráficos de ventas mensuales por sucursal */}
            <div className="space-y-4 md:space-y-6">
              {/* Ventas Mensuales - Labranza */}
              <ChartContainer 
                title="Ventas Mensuales - Labranza" 
                className="min-h-[500px]"
              >
                <SalesLabranzaMonthlyChart
                  monthlyData={monthlyData}
                  quarterOptions={quarterOptions}
                  monthOptions={monthOptions}
                  onFilterByQuarter={filterByQuarter}
                  onFilterByComparison={filterByComparison}
                />
              </ChartContainer>

              {/* Ventas Mensuales - Sevilla */}
              <ChartContainer 
                title="Ventas Mensuales - Sevilla" 
                className="min-h-[500px]"
              >
                <SalesSevillaMonthlyChart
                  monthlyData={monthlyData}
                  quarterOptions={quarterOptions}
                  monthOptions={monthOptions}
                  onFilterByQuarter={filterByQuarter}
                  onFilterByComparison={filterByComparison}
                />
              </ChartContainer>

              {/* Ventas Mensuales - Consolidado */}
              <ChartContainer 
                title="Ventas Mensuales - Consolidado" 
                className="min-h-[500px]"
              >
                <SalesConsolidadoMonthlyChart
                  monthlyData={monthlyData}
                  quarterOptions={quarterOptions}
                  monthOptions={monthOptions}
                  onFilterByQuarter={filterByQuarter}
                  onFilterByComparison={filterByComparison}
                />
              </ChartContainer>
            </div>

            {/* Resumen de datos */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                Resumen del Período
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {sections.map((section) => {
                  const ventasNetasRow = section.data.find(row => {
                    const item = String(row['Item'] || '').toLowerCase().trim();
                    return item.includes('venta') && item.includes('neta');
                  });
                  const anualMonto = ventasNetasRow?.['ANUAL Monto'] || 0;

                  return (
                    <div
                      key={section.name}
                      className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200"
                    >
                      <h4 className="text-xs md:text-sm font-medium text-gray-600 mb-1 md:mb-2">
                        {section.name}
                      </h4>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(parseMoneyString(anualMonto))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total acumulado
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
