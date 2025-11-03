'use client';

import { useState, useEffect } from 'react';

interface GraphSidebarProps {
  selectedPeriod: string | null;
  onPeriodChange: (period: string) => void;
  availablePeriods: string[];
}

export default function GraphSidebar({ selectedPeriod, onPeriodChange, availablePeriods }: GraphSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  console.log('GraphSidebar render:', { selectedPeriod, availablePeriods, isCollapsed, isMobileOpen });

  // Detectar tamaño de pantalla y auto-colapsar en tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePeriodChange = (period: string) => {
    onPeriodChange(period);
    if (window.innerWidth < 768) {
      setIsMobileOpen(false); // Cerrar drawer en móvil después de seleccionar
    }
  };

  return (
    <>
      {/* Botón flotante para móvil */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed bottom-6 left-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all"
        title="Abrir filtros"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>

      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full
          ${isCollapsed ? 'w-16 xl:w-20' : 'w-60 md:w-52 lg:w-64 xl:w-72 2xl:w-80'}
          
          /* Mobile: drawer desde la izquierda */
          fixed md:relative inset-y-0 left-0 z-50
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      {/* Header con botón de colapso */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Filtros</h2>
        )}
        <div className="flex items-center gap-2">
          {/* Botón cerrar en móvil */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Botón colapsar en desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${
                isCollapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenido del sidebar */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Selector de período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={selectedPeriod || ''}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
            >
              <option value="" className="text-gray-500">Seleccionar período</option>
              {availablePeriods.map((period) => (
                <option key={period} value={period} className="text-gray-900 font-medium">
                  {period}
                </option>
              ))}
            </select>
          </div>

          {/* Información adicional */}
          {selectedPeriod && (
            <div className="bg-indigo-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-indigo-900">
                  <p className="font-medium">Mostrando datos de:</p>
                  <p className="mt-1">{selectedPeriod}</p>
                </div>
              </div>
            </div>
          )}

          {/* Leyenda de colores */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Leyenda</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-indigo-600"></div>
                <span className="text-sm text-gray-600">Consolidado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm text-gray-600">Labranza</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-600"></div>
                <span className="text-sm text-gray-600">Sevilla</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Iconos colapsados */}
      {isCollapsed && (
        <div className="flex-1 p-2 space-y-4 pt-4">
          <button
            className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Filtros"
          >
            <svg className="w-6 h-6 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
      )}
    </div>
    </>
  );
}
