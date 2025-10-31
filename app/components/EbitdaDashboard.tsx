'use client';

import { useRef } from 'react';
import ChartContainer from './charts/ChartContainer';
import SalesVsEbitdaChart from './charts/SalesVsEbitdaChart';
import EbitdaLineChart from './charts/EbitdaLineChart';
import EbitdaComparisonChart from './charts/EbitdaComparisonChart';
import { useEbitdaData } from './charts/useEbitdaData';
import type { ExcelRow } from '@/types';

interface EbitdaDashboardProps {
  sections: { name: string; data: ExcelRow[] }[];
}

const parseMoneyString = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export default function EbitdaDashboard({ sections }: EbitdaDashboardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
    loadingDiv.innerHTML = '<div class="bg-white p-6 rounded-lg"><div class="flex items-center gap-3"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div><p class="text-lg font-semibold">Generando PDF de alta calidad...</p></div></div>';
    document.body.appendChild(loadingDiv);

    try {
      console.log('🎯 [v3.0-browserless] Generando PDF con Browserless.io...');
      
      // Convertir los canvas ORIGINALES a imágenes (antes de clonar)
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
      
      // Obtener todos los estilos de la página
      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            // Ignorar hojas de estilo externas que no se pueden leer
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

      // Construir HTML completo con estilos inline
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              ${styles}
              body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: white;
              }
            </style>
          </head>
          <body>
            ${clonedContent.outerHTML}
          </body>
        </html>
      `;

      // Llamar a la API de Browserless.io (vía nuestra ruta)
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: fullHtml,
          title: 'dashboard-ebitda',
        }),
      });

      if (response.ok && response.headers.get('Content-Type')?.includes('application/pdf')) {
        // Descargar el PDF generado por Browserless
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-ebitda-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);

        document.body.removeChild(loadingDiv);

        // Mensaje de éxito
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

      // Si Browserless falla, usar fallback
      console.warn('⚠️ Browserless no disponible, usando fallback dom-to-image...');
      console.warn('Response status:', response.status);
      const errorData = await response.json().catch(() => ({}));
      console.warn('Error data:', errorData);
      console.warn('Error message:', errorData.message || 'Sin mensaje de error');
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

        pdf.save(`dashboard-ebitda-${new Date().toISOString().split('T')[0]}.pdf`);
        
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
  
  const { salesVsEbitda, ebitdaMonthly, hasData } = useEbitdaData(sections);

  // Calcular métricas para las cards superiores
  const consolidadosSection = sections.find(s => s.name === 'Consolidados');
  const labranzaSection = sections.find(s => s.name === 'Labranza');
  const sevillaSection = sections.find(s => s.name === 'Sevilla');

  const ebitdaConsolidadoRow = consolidadosSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
  });

  const ventasNetasRow = consolidadosSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    return item.includes('venta') && item.includes('neta');
  });

  const ebitdaLabranzaRow = labranzaSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
  });

  const ebitdaSevillaRow = sevillaSection?.data.find(row => {
    const item = String(row['Item'] || '').toLowerCase().replace(/["\s]/g, '').trim();
    return item === 'ebitda' || item === 'ebidta' || item.includes('ebitda') || item.includes('ebidta');
  });

  const ebitdaTotal = parseMoneyString(ebitdaConsolidadoRow?.['ANUAL Monto']);
  const ventasTotal = parseMoneyString(ventasNetasRow?.['ANUAL Monto']);
  const margenEbitda = ventasTotal > 0 ? ((ebitdaTotal / ventasTotal) * 100) : 0;
  
  const ebitdaLabranza = parseMoneyString(ebitdaLabranzaRow?.['ANUAL Monto']);
  const ebitdaSevilla = parseMoneyString(ebitdaSevillaRow?.['ANUAL Monto']);

  if (!hasData) {
    return (
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
            No hay datos de EBITDA disponibles
          </h3>
          <p className="text-sm text-gray-500">
            Los datos cargados no contienen información de EBITDA
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Botón de exportar PDF fijo */}
      <button
        onClick={handleExportPDF}
        className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-colors z-50"
        title="Exportar dashboard completo a PDF"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exportar PDF
      </button>

      <div ref={contentRef} className="space-y-6">
        {/* Cards de métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">EBITDA Total</h3>
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact',
                compactDisplay: 'short',
              }).format(ebitdaTotal)}
            </p>
            <p className="text-sm mt-2 opacity-80">Acumulado anual</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Margen EBITDA</h3>
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold">{margenEbitda.toFixed(1)}%</p>
            <p className="text-sm mt-2 opacity-80">EBITDA / Ventas Netas</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Mejor Unidad</h3>
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <p className="text-2xl font-bold">
              {ebitdaLabranza > ebitdaSevilla ? 'Labranza' : 'Sevilla'}
            </p>
            <p className="text-sm mt-2 opacity-80">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact',
                compactDisplay: 'short',
              }).format(Math.max(ebitdaLabranza, ebitdaSevilla))}
            </p>
          </div>
        </div>

        {/* Gráfico principal: Ventas vs EBITDA */}
        <ChartContainer title="Análisis de Ventas vs EBITDA">
          <SalesVsEbitdaChart data={salesVsEbitda} />
        </ChartContainer>

        {/* Gráficos secundarios lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <ChartContainer title="Evolución EBITDA Mensual">
            <EbitdaLineChart data={ebitdaMonthly} />
          </ChartContainer>

          <ChartContainer title="Comparación por Unidad">
            <EbitdaComparisonChart 
              labranzaTotal={ebitdaLabranza}
              sevillaTotal={ebitdaSevilla}
              consolidadoTotal={ebitdaTotal}
            />
          </ChartContainer>
        </div>

        {/* Tabla resumen mensual */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Resumen Mensual EBITDA
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Labranza
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sevilla
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variación
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ebitdaMonthly.map((item, index) => {
                  const prevTotal = index > 0 ? ebitdaMonthly[index - 1].total : item.total;
                  const variation = prevTotal > 0 ? ((item.total - prevTotal) / prevTotal * 100) : 0;
                  
                  return (
                    <tr key={item.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.month}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(item.labranza)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(item.sevilla)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(item.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {index === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className={`font-semibold ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}