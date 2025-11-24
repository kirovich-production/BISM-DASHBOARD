'use client';

import { useState, useEffect, useRef } from 'react';
import PeriodInput from './components/PeriodInput';
import DashboardView from './components/DashboardView';
import DashboardSidebar from './components/DashboardSidebar';
import TableView from './components/TableView';
import SevillaTable from './components/tables/SevillaTable';
import LabranzaTable from './components/tables/LabranzaTable';
import TrimestralAnalysisView from './components/TrimestralAnalysisView';
import MesAnualChartsView from './components/MesAnualChartsView';
import DynamicComparativoEbitda from './components/dynamic/DynamicComparativoEbitda';
import DynamicEbidtaCombo from './components/dynamic/DynamicEbidtaCombo';
import LibroComprasUpload from './components/LibroComprasUpload';
import LibroComprasView from './components/LibroComprasView';
import { UploadResponse, UploadedDocument, Period } from '@/types';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
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

  // Recargar períodos cuando cambia el usuario seleccionado
  useEffect(() => {
    if (selectedUserName && selectedUserName !== lastFetchedUser.current) {
      lastFetchedUser.current = selectedUserName;
      fetchPeriods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserName]);

  // Cargar datos del período seleccionado
  useEffect(() => {
    if (selectedPeriod && selectedUserName) {
      fetchData(selectedPeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedUserName]);

  // Recargar períodos después de un upload exitoso
  useEffect(() => {
    if (uploadedData?.success) {
      fetchPeriods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedData]);

  const fetchPeriods = async () => {
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
      if (selectedUserName) {
        url += `?userName=${encodeURIComponent(selectedUserName)}`;
      } else {
        // Si no hay usuario seleccionado, no cargar períodos
        setPeriods([]);
        fetchPeriodsInProgress.current = false;
        return;
      }

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

  const fetchData = async (period?: string) => {
    // Cancelar request anterior si existe
    if (abortControllers.current.data) {
      abortControllers.current.data.abort();
    }

    // Prevenir llamadas duplicadas al mismo período
    const cacheKey = `${period}-${selectedUserName}`;
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
      
      if (selectedUserName) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handlePeriodInputChange = (period: string, periodLabel: string) => {
    setUploadPeriod(period);
    setUploadPeriodLabel(periodLabel);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage({ type: 'error', text: 'Por favor selecciona un archivo' });
      return;
    }

    if (!uploadPeriod || !uploadPeriodLabel) {
      setMessage({ type: 'error', text: 'Por favor selecciona un período' });
      return;
    }

    if (!uploadUserId || !uploadUserName) {
      setMessage({ type: 'error', text: '⚠️ Por favor selecciona un usuario antes de cargar el archivo' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('period', uploadPeriod);
      formData.append('periodLabel', uploadPeriodLabel);
      formData.append('userId', uploadUserId);
      formData.append('userName', uploadUserName);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ ${result.message}. Período: ${result.periodLabel}. Secciones encontradas: ${result.sectionsFound.join(', ')}`
        });
        setUploadedData(result);
        setFile(null);
        // Limpiar el input file
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Seleccionar automáticamente el período recién cargado
        setSelectedPeriod(result.period);
        
        // 🎯 NUEVA LÓGICA: Crear sesión y redirigir a dashboard
        // Crear sesión con el usuario que subió los datos
        await createSession(uploadUserId, uploadUserName);
        
        // Actualizar usuario seleccionado globalmente
        setSelectedUserId(uploadUserId);
        setSelectedUserName(uploadUserName);
        
        // Redirigir a dashboard
        setTimeout(() => {
          setActiveView('dashboard');
        }, 1500); // Dar tiempo para ver mensaje de éxito
        
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error}` });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ Error al subir el archivo' });
    } finally {
      setLoading(false);
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
        ) : activeView === 'upload' ? (
          /* Upload Section Only */
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="text-center mb-6 md:mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
               BISM Dashboard
                </h1>
                <p className="text-sm md:text-base text-gray-600">
                  Sistema de análisis financiero - Carga y visualización de datos
                </p>
              </div>

              {/* Upload Card */}
              <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 lg:p-10 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Cargar Nuevo Período
            </h2>
          </div>
          
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Period Input */}
            <PeriodInput 
              onPeriodChange={handlePeriodInputChange}
              onUserChange={handleUserChange}
              selectedUserId={uploadUserId}
              selectedUserName={uploadUserName}
            />

            <div>
              <label 
                htmlFor="file-input" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Archivo Excel (debe contener hoja &quot;Consolidado&quot;)
              </label>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100
                  cursor-pointer"
              />
            </div>

            {file && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      Archivo seleccionado
                    </p>
                    <p className="text-base font-bold text-blue-800">
                      {file.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Tamaño: {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      const fileInput = document.getElementById('file-input') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Quitar archivo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={!file || loading || !uploadUserId}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3.5 px-6 rounded-lg
                  font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all
                  disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 shadow-lg hover:shadow-xl
                  transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                        fill="none"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Cargando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Subir Archivo
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => selectedPeriod && fetchData(selectedPeriod)}
                disabled={loadingData || !selectedPeriod}
                className="sm:w-auto px-6 bg-gray-600 text-white py-3.5 rounded-lg
                  font-semibold hover:bg-gray-700 transition-all
                  disabled:bg-gray-400 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 shadow-lg hover:shadow-xl
                  transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>
          </form>

          {/* Messages */}
          {message && (
            <div className={`mt-6 p-5 rounded-lg border-2 shadow-md ${
              message.type === 'success' 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
                : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`${
                  message.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                } p-2 rounded-lg`}>
                  {message.type === 'success' ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <p className={`text-sm font-medium flex-1 ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Upload Summary */}
            {uploadedData && (
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-lg p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Resumen de carga</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Período</p>
                  <p className="text-sm font-bold text-gray-900">{uploadedData.periodLabel}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Archivo</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{uploadedData.fileName}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Hoja procesada</p>
                  <p className="text-sm font-bold text-gray-900">{uploadedData.sheetName}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Secciones</p>
                  <p className="text-sm font-bold text-gray-900">{uploadedData.sectionsFound.join(', ')}</p>
                </div>
              </div>
            </div>
          )}
              </div>
              
              {/* Card de Libro de Compras */}
              <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 lg:p-10 border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Cargar Libro de Compras
                  </h2>
                </div>
                
                <LibroComprasUpload 
                  userId={selectedUserId || ''}
                  onUploadSuccess={() => {
                    // Redirigir a vista de Libro de Compras después de carga exitosa
                    setTimeout(() => {
                      setActiveView('libro-compras');
                    }, 1500);
                  }}
                />
              </div>
            </div>
          </div>
        ) : activeView === 'libro-compras' ? (
          /* Libro de Compras View con Tabs */
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
