'use client';

import { useState, RefObject } from 'react';
import { useReportStore } from '@/lib/reportStore';

interface AddToReportButtonProps {
  viewName: string;
  uniqueKey: string; // Identificador único basado en parámetros del gráfico
  contentRef: RefObject<HTMLElement>;
  period: string;
  disabled?: boolean;
  captureMode?: 'image' | 'html'; // 'image' para capturas simples, 'html' para contenido complejo
  htmlGenerator?: () => Promise<string>; // Función para generar HTML personalizado
}

export default function AddToReportButton({ 
  viewName,
  uniqueKey, 
  contentRef, 
  period,
  disabled = false,
  captureMode = 'image',
  htmlGenerator
}: AddToReportButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const { addGraph } = useReportStore();

  const handleAddToReport = async () => {
    if (isCapturing || justAdded || alreadyExists) return;

    setIsCapturing(true);

    try {
      let wasAdded = false;

      if (captureMode === 'html' && htmlGenerator) {
        // Modo HTML con generador personalizado
        const htmlData = await htmlGenerator();

        // Agregar al store con HTML
        wasAdded = addGraph({
          viewName,
          uniqueKey,
          htmlData,
          period,
        });
      } else if (captureMode === 'html') {
        // Modo HTML genérico (deprecado - mantener por compatibilidad)
        if (!contentRef.current) return;
        
        const element = contentRef.current;
        
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

        const htmlData = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <style>${styles}</style>
          </head>
          <body>
            ${element.outerHTML}
          </body>
          </html>
        `;

        wasAdded = addGraph({
          viewName,
          uniqueKey,
          htmlData,
          period,
        });
      } else {
        // Modo Imagen: Capturar con html2canvas (para gráficos simples)
        if (!contentRef.current) return;
        
        const { default: html2canvas } = await import('html2canvas');

        const canvas = await html2canvas(contentRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          width: contentRef.current.scrollWidth,
          height: contentRef.current.scrollHeight,
          windowWidth: 1920,
          windowHeight: 1080,
          scrollX: 0,
          scrollY: 0,
          foreignObjectRendering: false,
          imageTimeout: 15000,
        });

        const imageData = canvas.toDataURL('image/png', 1.0);

        // Agregar al store con imagen
        wasAdded = addGraph({
          viewName,
          uniqueKey,
          imageData,
          period,
        });
      }

      // Verificar si fue agregado o ya existía
      if (!wasAdded) {
        // Ya existe - mostrar mensaje de error
        setIsCapturing(false);
        setAlreadyExists(true);
        setTimeout(() => {
          setAlreadyExists(false);
        }, 1000);
        return;
      }

      // Mostrar notificación de éxito
      const notification = document.createElement('div');
      notification.className = 'fixed top-30 right-60 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-3 animate-slide-in';
      notification.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Gráfico agregado al reporte</span>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.remove();
      }, 1000);

      // Mostrar estado "Agregado" por 1000ms y luego volver al estado inicial
      setIsCapturing(false);
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
      }, 1000);

    } catch (error) {
      console.error('Error capturando gráfico:', error);
      alert('Error al capturar el gráfico. Inténtalo nuevamente.');
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleAddToReport}
        disabled={disabled || isCapturing || justAdded || alreadyExists}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${alreadyExists
            ? 'bg-red-50 text-red-700 border-2 border-red-600'
            : justAdded 
              ? 'bg-green-50 text-green-700 border-2 border-green-600' 
              : 'bg-indigo-50 text-indigo-700 border-2 border-indigo-600 hover:bg-indigo-100'
          }
          disabled:opacity-75
          shadow-md hover:shadow-lg
        `}
        title="Agregar al reporte"
      >
        {isCapturing ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Capturando...</span>
        </>
      ) : alreadyExists ? (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>Ya agregado</span>
        </>
      ) : justAdded ? (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Agregado</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Agregar al Reporte</span>
        </>
      )}
      </button>
      {alreadyExists && (
        <div className="absolute top-full mt-1 left-0 right-0 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
          Este gráfico ya fue cargado al reporte
        </div>
      )}
    </div>
  );
}
