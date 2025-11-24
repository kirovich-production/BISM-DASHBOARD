'use client';

import { useState, useEffect } from 'react';
import LibroComprasTable from './LibroComprasTable';
import ProveedoresTable from './ProveedoresTable';
import ProveedoresMantenedor from './ProveedoresMantenedor';

interface LibroComprasViewProps {
  userId: string | null;
  periodo: string | null;
}

interface PeriodoLC {
  periodo: string;
  periodLabel: string;
}

export default function LibroComprasView({ userId }: LibroComprasViewProps) {
  const [activeTab, setActiveTab] = useState<'lc' | 'proveedores' | 'mantenedor'>('lc');
  const [periodos, setPeriodos] = useState<PeriodoLC[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);

  // Cargar períodos disponibles de Libro de Compras
  useEffect(() => {
    if (!userId) return;
    
    const fetchPeriods = async () => {
      setIsLoadingPeriods(true);
      try {
        const response = await fetch(`/api/libro-compras/periods?userId=${userId}`);
        const result = await response.json();
        
        if (result.success && result.periods) {
          setPeriodos(result.periods);
          // Seleccionar el primer período si existe
          if (result.periods.length > 0 && !selectedPeriodo) {
            setSelectedPeriodo(result.periods[0].periodo);
          }
        }
      } catch (error) {
        console.error('[LibroComprasView] Error al cargar períodos:', error);
      } finally {
        setIsLoadingPeriods(false);
      }
    };
    
    fetchPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="bg-white h-full overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-800">Libro de Compras</h2>
            
            {/* Selector de Período */}
            {userId && periodos.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Período:</label>
                <select
                  value={selectedPeriodo || ''}
                  onChange={(e) => setSelectedPeriodo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoadingPeriods}
                >
                  {periodos.map((p) => (
                    <option key={p.periodo} value={p.periodo}>
                      {p.periodLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Gestión de transacciones y proveedores del libro de compras
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('lc')}
              className={`
                pb-3 px-4 font-medium text-sm border-b-2 transition-colors
                ${activeTab === 'lc'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Libro de Compras (LC)
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('proveedores')}
              className={`
                pb-3 px-4 font-medium text-sm border-b-2 transition-colors
                ${activeTab === 'proveedores'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Proveedores
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('mantenedor')}
              className={`
                pb-3 px-4 font-medium text-sm border-b-2 transition-colors
                ${activeTab === 'mantenedor'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Mantenedor
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'lc' && (
            <div>
              {userId && selectedPeriodo ? (
                <LibroComprasTable 
                  key={`${userId}-${selectedPeriodo}`}
                  userId={userId}
                  periodo={selectedPeriodo}
                />
              ) : userId && periodos.length === 0 && !isLoadingPeriods ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    No hay períodos cargados
                  </p>
                  <p className="text-xs text-blue-600">
                    Dirígete a &quot;Cargar Datos&quot; para subir un archivo de Libro de Compras
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-700 font-medium">
                    Selecciona un usuario para visualizar el libro de compras
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'proveedores' && (
            <div>
              {userId ? (
                <ProveedoresTable />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-700 font-medium">
                    Selecciona un usuario para visualizar proveedores
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mantenedor' && (
            <div>
              <ProveedoresMantenedor />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
