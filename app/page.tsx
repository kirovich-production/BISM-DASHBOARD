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
  const [uploadedData, setUploadedData] = useState<UploadResponse | null>(null);
  const [excelData, setExcelData] = useState<UploadedDocument | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [uploadPeriod, setUploadPeriod] = useState<string>('');
  const [uploadPeriodLabel, setUploadPeriodLabel] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('dashboard');
  
  // Estados de usuario
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [uploadUserId, setUploadUserId] = useState<string>('');
  const [uploadUserName, setUploadUserName] = useState<string>('');
  
  // Refs para prevenir llamadas duplicadas
  const fetchPeriodsInProgress = useRef(false);
  const fetchDataInProgress = useRef(false);
  const lastFetchedPeriod = useRef<string | null>(null);
  const lastFetchedUser = useRef<string>('');
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
          setUploadUserId(result.userId);
          setUploadUserName(result.userName);
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

  // Recargar períodos cuando cambia el usuario seleccionado o la vista activa
  useEffect(() => {
    if (selectedUserName && selectedUserName !== lastFetchedUser.current) {
      lastFetchedUser.current = selectedUserName;
      const sucursal = activeView === 'sevilla' ? 'Sevilla' 
                     : activeView === 'labranza' ? 'Labranza'
                     : undefined;
      fetchPeriods(sucursal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserName, activeView]);

  // Cargar períodos cuando se accede a Sevilla o Labranza sin período seleccionado
  useEffect(() => {
    if ((activeView === 'sevilla' || activeView === 'labranza') && selectedUserId && !selectedPeriod) {
      const sucursal = activeView === 'sevilla' ? 'Sevilla' : 'Labranza';
      fetchPeriods(sucursal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedUserId]);

  // Cargar datos del período seleccionado
  useEffect(() => {
    if (selectedPeriod && selectedUserName) {
      // Determinar sucursal según activeView
      const sucursal = activeView === 'sevilla' ? 'Sevilla' 
                     : activeView === 'labranza' ? 'Labranza'
                     : undefined;
      fetchData(selectedPeriod, sucursal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedUserName, activeView]);

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
      
      let url = '/api/periods';
      const params = new URLSearchParams();
      
      // Si no hay usuario seleccionado, no cargar períodos
      if (!selectedUserName && !selectedUserId) {
        setPeriods([]);
        fetchPeriodsInProgress.current = false;
        return;
      }
      
      // Si hay sucursal (Libro de Compras), usar userId. Si no, usar userName (Excel tradicional)
      if (sucursalFilter && selectedUserId) {
        params.append('userId', selectedUserId);
        params.append('sucursal', sucursalFilter);
      } else if (selectedUserName) {
        params.append('userName', selectedUserName);
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
      } else if (result.periods && result.periods.length === 0 && selectedUserName) {
        // 🔍 Usuario guardado en localStorage pero sin períodos (posiblemente eliminado)
        // Intentar verificar si el usuario existe consultando la API
        // Si no hay períodos, probablemente el usuario fue eliminado
        // Limpiar localStorage para evitar confusión
        localStorage.removeItem('bism_selectedUserId');
        localStorage.removeItem('bism_selectedUserName');
        setSelectedUserId(null);
        setSelectedUserName('');
        setUploadUserId('');
        setUploadUserName('');
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

  const fetchData = async (period?: string, sucursal?: 'Sevilla' | 'Labranza') => {
    // Cancelar request anterior si existe
    if (abortControllers.current.data) {
      abortControllers.current.data.abort();
    }

    // Prevenir llamadas duplicadas al mismo período
    const cacheKey = `${period}-${selectedUserName}-${sucursal || ''}`;
    if (fetchDataInProgress.current || lastFetchedPeriod.current === cacheKey) {
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
      
      // Si hay sucursal (Libro de Compras), usar userId. Si no, usar userName (Excel tradicional)
      if (sucursal && selectedUserId) {
        params.append('userId', selectedUserId);
        params.append('sucursal', sucursal);
      } else if (selectedUserName) {
        params.append('userName', selectedUserName);
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
        setExcelData(result.data);
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
    setUploadUserId(userId);
    setUploadUserName(userName);
    
    // También actualizar el usuario seleccionado globalmente
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
          excelData && selectedPeriod ? (
            <div className="bg-white h-full overflow-hidden flex flex-col">
              {/* Content */}
              {activeView === 'sevilla' ? (
                <SevillaTable
                  data={excelData.sevilla || null}
                  periodLabel={excelData.periodLabel}
                  version={excelData.version}
                  uploadedAt={excelData.uploadedAt}
                />
              ) : activeView === 'labranza' ? (
                <LabranzaTable
                  data={excelData.labranza || null}
                  periodLabel={excelData.periodLabel}
                  version={excelData.version}
                  uploadedAt={excelData.uploadedAt}
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
                  Primero debes cargar un archivo desde la sección &quot;Cargar Datos&quot;
                </p>
                <button
                  onClick={() => setActiveView('upload')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Ir a Cargar Datos
                </button>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
