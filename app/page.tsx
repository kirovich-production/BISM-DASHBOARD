'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardView from './components/DashboardView';
import DashboardSidebar from './components/DashboardSidebar';
import TableView from './components/TableView';
import SevillaTable from './components/tables/SevillaTable';
import LabranzaTable from './components/tables/LabranzaTable';
import TrimestralAnalysisView from './components/TrimestralAnalysisView';
import MesAnualChartsView from './components/MesAnualChartsView';
import DynamicComparativoEbitda from './components/dynamic/DynamicComparativoEbitda';
import DynamicEbidtaCombo from './components/dynamic/DynamicEbidtaCombo';
import LibroComprasView from './components/LibroComprasView';
import CargarDatosView from './components/CargarDatosView';
import { UploadResponse, UploadedDocument, Period } from '@/types';

export default function Home() {
  const [uploadedData] = useState<UploadResponse | null>(null);
  const [excelData, setExcelData] = useState<UploadedDocument | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>('dashboard');
  
  // Estados de usuario (solo Libro de Compras)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  
  // Refs para prevenir llamadas duplicadas
  const fetchPeriodsInProgress = useRef(false);
  const fetchDataInProgress = useRef(false);
  const lastFetchedPeriod = useRef<string | null>(null);
  const lastActiveView = useRef<string>('');
  const abortControllers = useRef<{
    periods?: AbortController;
    data?: AbortController;
  }>({});

  // 🔄 Cargar sesión desde servidor (DB Sessions) al montar el componente
  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const result = await response.json();
        
        if (result.success && result.userId && result.userName) {
          setSelectedUserId(result.userId);
          setSelectedUserName(result.userName);
        }
      } catch {
        // Error loading session
      }
    };

    loadSession();
  }, []);

  // Cleanup: Cancelar requests pendientes al desmontar
  useEffect(() => {
    const controllers = abortControllers.current;
    return () => {
      if (controllers.periods) {
        controllers.periods.abort();
      }
      if (controllers.data) {
        controllers.data.abort();
      }
    };
  }, []);

  // Cargar períodos cuando se accede a Sevilla, Labranza o Consolidado sin período seleccionado
  useEffect(() => {
    if ((activeView === 'sevilla' || activeView === 'labranza' || activeView === 'consolidado') && selectedUserId && !selectedPeriod) {
      // Para Consolidado, usamos Labranza para obtener períodos (ambas sucursales deberían tener los mismos períodos)
      const sucursal = activeView === 'sevilla' ? 'Sevilla' : 'Labranza';
      fetchPeriods(sucursal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedUserId]);

  // Cargar datos para vistas de Libro de Compras (Sevilla, Labranza, Consolidado)
  useEffect(() => {
    if (selectedUserId) {
      // Solo para vistas de Libro de Compras
      if (activeView === 'sevilla' || activeView === 'labranza' || activeView === 'consolidado') {
        // Determinar si necesita cargar datos según la vista específica
        let needsData = lastActiveView.current !== activeView || !excelData;
        
        // Validación adicional: verificar si la sección específica existe
        if (excelData) {
          if (activeView === 'sevilla' && !excelData.sevilla) needsData = true;
          if (activeView === 'labranza' && !excelData.labranza) needsData = true;
          if (activeView === 'consolidado' && !excelData.consolidado) needsData = true;
        }
        
        if (needsData) {
          lastActiveView.current = activeView;
          setLoadingData(true); // Mostrar spinner inmediatamente
          const sucursal = activeView === 'sevilla' ? 'Sevilla' 
                         : activeView === 'labranza' ? 'Labranza'
                         : undefined;
          fetchData(undefined, sucursal, true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedUserId, excelData]);

  // Recargar períodos después de un upload exitoso
  useEffect(() => {
    if (uploadedData?.success) {
      const sucursal = activeView === 'sevilla' ? 'Sevilla' 
                     : activeView === 'labranza' ? 'Labranza'
                     : undefined;
      fetchPeriods(sucursal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedData]);

  const fetchPeriods = async (sucursalFilter?: 'Sevilla' | 'Labranza') => {
    // Cancelar request anterior si existe
    if (abortControllers.current.periods) {
      abortControllers.current.periods.abort();
    }

    // Prevenir llamadas duplicadas
    if (fetchPeriodsInProgress.current) {
      return;
    }

    try {
      fetchPeriodsInProgress.current = true;
      
      // Libro de Compras requiere userId obligatorio
      if (!selectedUserId) {
        setPeriods([]);
        fetchPeriodsInProgress.current = false;
        return;
      }
      
      let url = '/api/periods';
      const params = new URLSearchParams();
      
      params.append('userId', selectedUserId);
      if (sucursalFilter) {
        params.append('sucursal', sucursalFilter);
      }
      
      url += `?${params.toString()}`;

      // Crear nuevo AbortController
      abortControllers.current.periods = new AbortController();
      
      const response = await fetch(url, {
        signal: abortControllers.current.periods.signal
      });
      const result = await response.json();
      
      if (result.success && result.periods) {
        setPeriods(result.periods);
        
        // Si no hay período seleccionado, seleccionar el más reciente
        if (!selectedPeriod && result.periods.length > 0) {
          setSelectedPeriod(result.periods[0].period);
        }
      } else if (result.periods && result.periods.length === 0) {
        setPeriods([]);
      }
    } catch (error) {
      // Ignorar errores de abort
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
    } finally {
      fetchPeriodsInProgress.current = false;
    }
  };

  const fetchData = async (period?: string, sucursal?: 'Sevilla' | 'Labranza', forceReload = false) => {
    // Cancelar request anterior si existe
    if (abortControllers.current.data) {
      abortControllers.current.data.abort();
    }

    // Libro de Compras requiere userId
    if (!selectedUserId) {
      setExcelData(null);
      return;
    }

    // Prevenir llamadas duplicadas al mismo período (a menos que sea forzado)
    const cacheKey = `${period}-${selectedUserId}-${sucursal || 'none'}-${activeView}`;
    
    // Si hay una request en progreso, esperar
    if (fetchDataInProgress.current) {
      return;
    }
    
    // Solo usar caché si el cacheKey es exactamente el mismo y NO es forceReload
    if (!forceReload && lastFetchedPeriod.current === cacheKey) {
      return;
    }

    fetchDataInProgress.current = true;
    lastFetchedPeriod.current = cacheKey;
    setLoadingData(true);
    
    try {
      let url = '/api/data';
      const params = new URLSearchParams();
      
      if (period) {
        params.append('period', period);
      }
      
      // Libro de Compras siempre usa userId
      params.append('userId', selectedUserId);
      if (sucursal) {
        params.append('sucursal', sucursal);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Crear nuevo AbortController
      abortControllers.current.data = new AbortController();
      
      const response = await fetch(url, {
        signal: abortControllers.current.data.signal
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        // Limpiar campos no relacionados según la sucursal solicitada
        // Esto asegura que cada vista solo muestre SUS propios datos
        // IMPORTANTE: Siempre crear un NUEVO objeto para forzar re-render
        if (sucursal === 'Labranza') {
          const newData: UploadedDocument = {
            userId: result.data.userId || selectedUserId || '',
            fileName: result.data.fileName || 'Libro de Compras',
            sheetName: result.data.sheetName || 'Labranza',
            period: result.data.period,
            periodLabel: result.data.periodLabel,
            version: result.data.version,
            uploadedAt: result.data.uploadedAt,
            labranza: result.data.labranza,
            sevilla: undefined,
            consolidado: undefined
          };
          setExcelData(newData);
        } else if (sucursal === 'Sevilla') {
          const newData: UploadedDocument = {
            userId: result.data.userId || selectedUserId || '',
            fileName: result.data.fileName || 'Libro de Compras',
            sheetName: result.data.sheetName || 'Sevilla',
            period: result.data.period,
            periodLabel: result.data.periodLabel,
            version: result.data.version,
            uploadedAt: result.data.uploadedAt,
            sevilla: result.data.sevilla,
            labranza: undefined,
            consolidado: undefined
          };
          setExcelData(newData);
        } else {
          // Consolidado o sin sucursal trae todo - crear nuevo objeto también
          const newData = { ...result.data };
          setExcelData(newData);
        }
      } else {
        setExcelData(null);
      }
    } catch (error) {
      // Ignorar errores de abort
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
    } finally {
      setLoadingData(false);
      fetchDataInProgress.current = false;
    }
  };

  const handleUserChange = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    
    // 💾 Crear sesión en servidor (DB Sessions)
    if (userId && userName) {
      createSession(userId, userName);
    } else {
      // Si se limpia el usuario, cerrar sesión
      deleteSession();
    }
  };

  // 💾 Crear sesión en servidor
  const createSession = async (userId: string, userName: string) => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName })
      });
      
      const result = await response.json();
      
      if (result.success) {
        } else {
        }
    } catch {
      // Error creating session
      }
  };

  // 🗑️ Cerrar sesión
  const deleteSession = async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      
      } catch {
      // Error closing session
      }
  };



  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Dark Sidebar */}
      <DashboardSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        selectedUserId={selectedUserId}
        selectedUserName={selectedUserName}
        onUserChange={handleUserChange}
        availableSections={excelData?.consolidado?.map(s => s.name.toLowerCase()) || []}
        periods={periods}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {activeView === 'dashboard' ? (
          /* Dashboard View */
          <div className="p-4 sm:p-6 lg:p-8">
            <DashboardView
              onNavigate={setActiveView}
              selectedPeriod={selectedPeriod}
              periodsCount={periods.length}
              selectedUserName={selectedUserName}
              hasData={excelData !== null}
              availableSections={
                excelData?.consolidado?.map(s => s.name.toLowerCase()) || []
              }
            />
          </div>
        ) : activeView === 'cargar-datos' ? (
          /* Cargar Datos View - Gestión de usuarios y carga de Libro de Compras */
          <div className="p-4 sm:p-6 lg:p-8">
            <CargarDatosView 
              selectedUserId={selectedUserId}
              selectedUserName={selectedUserName}
              onUserChange={(userId, userName) => {
                setSelectedUserId(userId);
                setSelectedUserName(userName);
              }}
            />
          </div>
        ) : activeView === 'libro-compras' ? (
          /* Libro de Compras View - Gestión completa */
          <LibroComprasView 
            userId={selectedUserId}
            periodo={selectedPeriod}
          />
        ) : activeView === 'sevilla' || activeView === 'labranza' || activeView === 'consolidado' || activeView === 'analisis-trimestral' || activeView === 'mes-anual' || activeView === 'waterfall-charts' || activeView === 'ebitda-combo' ? (
          /* Sevilla, Labranza, Consolidado, Charts and Mes-Anual Views */
          excelData ? (
            <div className="bg-white h-full overflow-hidden flex flex-col">
              {/* Content */}
              {activeView === 'sevilla' ? (
                <SevillaTable
                  data={excelData.sevilla || null}
                  periodLabel={excelData.periodLabel}
                  version={excelData.version}
                  uploadedAt={excelData.uploadedAt}
                  userId={selectedUserId || undefined}
                  periodo={selectedPeriod || undefined}
                  onDataRefresh={() => fetchData(undefined, 'Sevilla', true)}
                />
              ) : activeView === 'labranza' ? (
                <LabranzaTable
                  data={excelData.labranza || null}
                  periodLabel={excelData.periodLabel}
                  version={excelData.version}
                  uploadedAt={excelData.uploadedAt}
                  userId={selectedUserId || undefined}
                  periodo={selectedPeriod || undefined}
                  onDataRefresh={() => fetchData(undefined, 'Labranza', true)}
                />
              ) : activeView === 'consolidado' ? (
                <TableView
                  sections={excelData.consolidado || []}
                  periodLabel={excelData.periodLabel}
                  version={excelData.version}
                  uploadedAt={excelData.uploadedAt}
                />
              ) : activeView === 'analisis-trimestral' ? (
                <TrimestralAnalysisView
                  consolidadoData={excelData.consolidado?.find(s => s.name === 'Consolidados')?.data || []}
                  sevillaData={excelData.sevilla || null}
                  labranzaData={excelData.labranza || null}
                  periodLabel={excelData.periodLabel}
                />
              ) : activeView === 'mes-anual' ? (
                <MesAnualChartsView
                  consolidadoData={excelData.consolidado?.find(s => s.name === 'Consolidados')?.data || []}
                  sevillaData={excelData.sevilla && Array.isArray(excelData.sevilla) ? null : (excelData.sevilla || null)}
                  labranzaData={excelData.labranza && Array.isArray(excelData.labranza) ? null : (excelData.labranza || null)}
                  periodLabel={excelData.periodLabel}
                />
              ) : activeView === 'waterfall-charts' ? (
                <DynamicComparativoEbitda
                  consolidadoData={excelData.consolidado?.find(s => s.name === 'Consolidados')?.data || []}
                  sevillaData={excelData.sevilla && Array.isArray(excelData.sevilla) ? null : (excelData.sevilla || null)}
                  labranzaData={excelData.labranza && Array.isArray(excelData.labranza) ? null : (excelData.labranza || null)}
                  selectedUserName={selectedUserName}
                  selectedPeriod={excelData.periodLabel}
                />
              ) : activeView === 'ebitda-combo' ? (
                <DynamicEbidtaCombo
                  consolidadoData={excelData.consolidado?.find(s => s.name === 'Consolidados')?.data || []}
                  sevillaData={excelData.sevilla && Array.isArray(excelData.sevilla) ? undefined : (excelData.sevilla || undefined)}
                  labranzaData={excelData.labranza && Array.isArray(excelData.labranza) ? undefined : (excelData.labranza || undefined)}
                  selectedUserName={selectedUserName}
                  selectedPeriod={excelData.periodLabel}
                />
              ) : null}
            </div>
          ) : loadingData ? (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
                <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Cargando datos...
                </h3>
                <p className="text-gray-500">
                  Por favor espera un momento
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
                <svg className="mx-auto h-16 w-16 text-indigo-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No hay datos disponibles
                </h3>
                <p className="text-gray-500 mb-6">
                  Selecciona un usuario en &quot;Cargar Datos&quot; para comenzar
                </p>
                
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
