'use client';

import { useState } from 'react';
import { useReportStore } from '@/lib/reportStore';

export default function ReportQueuePanel() {
  const { graphs, removeGraph, clearAll, isGenerating } = useReportStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGeneratePDF = async () => {
    if (graphs.length === 0) {
      alert('Agrega al menos un gráfico al reporte.');
      return;
    }

    useReportStore.getState().setGenerating(true);

    try {
      const response = await fetch('/api/generate-pdf-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          graphs: graphs.map(g => ({
            viewName: g.viewName,
            imageData: g.imageData,
            htmlData: g.htmlData,
            period: g.period,
            notes: g.notes,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar el PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-completo-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Opcional: Limpiar cola después de generar
      // clearAll();
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Inténtalo nuevamente.');
    } finally {
      useReportStore.getState().setGenerating(false);
    }
  };

  // Badge flotante (siempre visible)
  if (!isExpanded && graphs.length > 0) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all hover:scale-110 p-4 flex items-center gap-3"
        title="Ver reporte"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-semibold">Mi Reporte</span>
        <span className="bg-white text-indigo-600 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
          {graphs.length}
        </span>
      </button>
    );
  }

  // Panel expandido
  if (!isExpanded) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={() => setIsExpanded(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold">Mi Reporte</h2>
              <p className="text-sm text-indigo-200">{graphs.length} gráfico{graphs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de gráficos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {graphs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-center">No hay gráficos agregados</p>
              <p className="text-sm text-center mt-2">Usa el botón &quot;Agregar al Reporte&quot; en cualquier vista de gráficos</p>
            </div>
          ) : (
            graphs.map((graph, index) => (
              <div key={graph.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-indigo-300 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Número */}
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {graph.viewName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {graph.period}
                    </p>
                    
                    {/* Miniatura */}
                    <div className="mt-2 relative bg-white rounded border border-gray-200 overflow-hidden">
                      {graph.imageData ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={graph.imageData}
                            alt={graph.viewName}
                            className="w-full h-24 object-contain"
                          />
                        </>
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center bg-gray-50 text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Notas (si existen) */}
                    {graph.notes && (
                      <p className="text-xs text-gray-600 mt-2 italic">
                        &quot;{graph.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => removeGraph(graph.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer con acciones */}
        {graphs.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generar Reporte PDF</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (confirm('¿Estás seguro de eliminar todos los gráficos?')) {
                  clearAll();
                }
              }}
              className="w-full bg-white text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors border border-gray-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Limpiar Todo</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
