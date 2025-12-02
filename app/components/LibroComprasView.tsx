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
  sucursal: string;
}

export default function LibroComprasView({ userId }: LibroComprasViewProps) {
  const [activeTab, setActiveTab] = useState<'lc' | 'proveedores' | 'mantenedor'>('lc');
  const [periodos, setPeriodos] = useState<PeriodoLC[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<PeriodoLC[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);

  // Cargar períodos disponibles de Libro de Compras cuando se selecciona una sucursal
  useEffect(() => {
    if (!userId || !selectedSucursal) {
      setPeriodos([]);
      setAvailableYears([]);
      setAvailableMonths([]);
      setSelectedYear(null);
      setSelectedMonth(null);
      setSelectedPeriodo(null);
      return;
    }
    
    const fetchPeriods = async () => {
      setIsLoadingPeriods(true);
      try {
        const response = await fetch(`/api/libro-compras/periods?userId=${userId}&sucursal=${selectedSucursal}`);
        const result = await response.json();
        
        if (result.success && result.periods) {
          setPeriodos(result.periods);
          
          // Extraer años únicos
          const years = [...new Set(result.periods.map((p: PeriodoLC) => {
            // Extraer año del periodo (formato: "YYYYMM" o "YYYY-MM")
            const yearMatch = p.periodo.match(/^(\d{4})/);
            return yearMatch ? yearMatch[1] : null;
          }).filter(Boolean))].sort().reverse();
          
          setAvailableYears(years as string[]);
          
          // Auto-seleccionar primer año si existe
          if (years.length > 0) {
            setSelectedYear(years[0] as string);
          }
        }
      } catch (error) {
        console.error('[LibroComprasView] Error al cargar períodos:', error);
      } finally {
        setIsLoadingPeriods(false);
      }
    };
    
    fetchPeriods();
  }, [userId, selectedSucursal]);

  // Filtrar meses disponibles cuando se selecciona un año
  useEffect(() => {
    if (!selectedYear || periodos.length === 0) {
      setAvailableMonths([]);
      setSelectedMonth(null);
      setSelectedPeriodo(null);
      return;
    }

    const monthsForYear = periodos.filter(p => p.periodo.startsWith(selectedYear));
    setAvailableMonths(monthsForYear);
    
    // Auto-seleccionar primer mes si existe
    if (monthsForYear.length > 0) {
      setSelectedMonth(monthsForYear[0].periodo);
      setSelectedPeriodo(monthsForYear[0].periodo);
    }
  }, [selectedYear, periodos]);

  return (
    <div className="bg-white h-full overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-800">Libro de Compras</h2>
            
            {/* Selectores en Cascada: Sucursal → Año → Mes */}
            {userId && (
              <div className="flex items-center gap-3">
                {/* 1. Selector de Sucursal */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 font-medium">Sucursal:</label>
                  <select
                    value={selectedSucursal || ''}
                    onChange={(e) => setSelectedSucursal(e.target.value || null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Sevilla">Sevilla</option>
                    <option value="Labranza">Labranza</option>
                  </select>
                </div>

                {/* 2. Selector de Año (solo si hay sucursal seleccionada) */}
                {selectedSucursal && availableYears.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium">Año:</label>
                    <select
                      value={selectedYear || ''}
                      onChange={(e) => setSelectedYear(e.target.value || null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 min-w-[100px]"
                      disabled={isLoadingPeriods}
                    >
                      <option value="">Seleccionar...</option>
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Selector de Mes (solo si hay año seleccionado) */}
                {selectedYear && availableMonths.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium">Mes:</label>
                    <select
                      value={selectedMonth || ''}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value || null);
                        setSelectedPeriodo(e.target.value || null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-w-[140px]"
                      disabled={isLoadingPeriods}
                    >
                      <option value="">Seleccionar...</option>
                      {availableMonths.map((p) => (
                        <option key={p.periodo} value={p.periodo}>
                          {p.periodLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
              {userId && selectedPeriodo && selectedSucursal ? (
                <LibroComprasTable 
                  key={`${userId}-${selectedPeriodo}-${selectedSucursal}`}
                  userId={userId}
                  periodo={selectedPeriodo}
                  sucursal={selectedSucursal}
                />
              ) : !userId ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-700 font-medium">
                    Selecciona un usuario para visualizar el libro de compras
                  </p>
                </div>
              ) : !selectedSucursal ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    Selecciona una sucursal
                  </p>
                  <p className="text-xs text-blue-600">
                    Elige Sevilla o Labranza para ver los períodos disponibles
                  </p>
                </div>
              ) : !selectedYear ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-green-700 font-medium mb-2">
                    Selecciona un año
                  </p>
                  <p className="text-xs text-green-600">
                    Elige el año para ver los meses disponibles
                  </p>
                </div>
              ) : !selectedMonth ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-purple-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-purple-700 font-medium mb-2">
                    Selecciona un mes
                  </p>
                  <p className="text-xs text-purple-600">
                    Elige el mes para visualizar el libro de compras
                  </p>
                </div>
              ) : periodos.length === 0 && !isLoadingPeriods ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    No hay períodos cargados para {selectedSucursal}
                  </p>
                  <p className="text-xs text-blue-600">
                    Dirígete a &quot;Cargar Datos&quot; para subir un archivo de Libro de Compras
                  </p>
                </div>
              ) : null}
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
