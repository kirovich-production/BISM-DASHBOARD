'use client';

import { useState, useEffect } from 'react';
import PeriodInput from './components/PeriodInput';
import GraphView from './components/GraphView';
import EbitdaDashboard from './components/EbitdaDashboard';
import DashboardView from './components/DashboardView';
import DashboardSidebar from './components/DashboardSidebar';
import TableView from './components/TableView';
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
  const [selectedVersion] = useState<number | null>(null);
  const [uploadPeriod, setUploadPeriod] = useState<string>('');
  const [uploadPeriodLabel, setUploadPeriodLabel] = useState<string>('');
  const [activeView, setActiveView] = useState<'dashboard' | 'charts' | 'ebitda' | 'tables' | 'upload'>('dashboard');

  // Cargar períodos al montar el componente
  useEffect(() => {
    fetchPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar datos del período y versión seleccionados
  useEffect(() => {
    if (selectedPeriod) {
      fetchData(selectedPeriod, selectedVersion);
    }
  }, [selectedPeriod, selectedVersion]);

  // Recargar períodos después de un upload exitoso
  useEffect(() => {
    if (uploadedData?.success) {
      fetchPeriods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedData]);

  const fetchPeriods = async () => {
    try {
      const response = await fetch('/api/periods');
      const result = await response.json();
      
      if (result.success && result.periods) {
        setPeriods(result.periods);
        
        // Si no hay período seleccionado, seleccionar el más reciente
        if (!selectedPeriod && result.periods.length > 0) {
          setSelectedPeriod(result.periods[0].period);
        }
      }
    } catch (error) {
      console.error('Error al cargar períodos:', error);
    }
  };

  const fetchData = async (period?: string, version?: number | null) => {
    setLoadingData(true);
    try {
      let url = '/api/data';
      const params = new URLSearchParams();
      
      if (period) {
        params.append('period', period);
      }
      
      if (version !== null && version !== undefined) {
        params.append('version', version.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success && result.data) {
        setExcelData(result.data);
      } else {
        setExcelData(null);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoadingData(false);
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

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('period', uploadPeriod);
      formData.append('periodLabel', uploadPeriodLabel);

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
      } else {
        setMessage({ type: 'error', text: `❌ ${result.error}` });
      }
    } catch (error) {
      console.error('Error:', error);
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
            />
          </div>
        ) : activeView === 'upload' ? (
          /* Upload Section Only */
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-[95%] 2xl:max-w-[1800px] mx-auto">
              {/* Header */}
              <div className="text-center mb-6 md:mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                  📊 BISM Dashboard
                </h1>
                <p className="text-sm md:text-base text-gray-600">
                  Sistema de análisis financiero - Carga y visualización de datos
                </p>
              </div>

              {/* Upload Card */}
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            📤 Cargar Nuevo Período
          </h2>
          
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Period Input */}
            <PeriodInput onPeriodChange={handlePeriodInputChange} />

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
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  📄 Archivo seleccionado: <strong>{file.name}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Tamaño: {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!file || loading}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg
                  font-semibold hover:bg-indigo-700 transition-colors
                  disabled:bg-gray-400 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
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
                onClick={() => selectedPeriod && fetchData(selectedPeriod, selectedVersion)}
                disabled={loadingData || !selectedPeriod}
                className="bg-gray-600 text-white py-3 px-6 rounded-lg
                  font-semibold hover:bg-gray-700 transition-colors
                  disabled:bg-gray-400 disabled:cursor-not-allowed
                  flex items-center gap-2"
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
            <div className={`mt-6 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Upload Summary */}
            {uploadedData && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📋 Resumen de carga</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Período:</strong> {uploadedData.periodLabel}</p>
                <p><strong>Archivo:</strong> {uploadedData.fileName}</p>
                <p><strong>Hoja:</strong> {uploadedData.sheetName}</p>
                <p><strong>Secciones:</strong> {uploadedData.sectionsFound.join(', ')}</p>
              </div>
            </div>
          )}
              </div>
            </div>
          </div>
        ) : activeView === 'tables' || activeView === 'charts' || activeView === 'ebitda' ? (
          /* Tables, Charts and EBITDA Views */
          excelData && selectedPeriod ? (
            <div className="bg-white h-full overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white">
                      {excelData.fileName}
                    </h2>
                    <p className="text-indigo-100 text-xs md:text-sm mt-1">
                      Datos Financieros - {excelData.periodLabel}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-1 w-full sm:w-auto">
                    <button
                      onClick={() => setActiveView('tables')}
                      className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                        activeView === 'tables'
                          ? 'bg-white text-indigo-600 shadow-lg'
                          : 'text-white hover:bg-white/20'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">Tablas</span>
                    </button>
                    <button
                      onClick={() => setActiveView('charts')}
                      className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                        activeView === 'charts'
                          ? 'bg-white text-indigo-600 shadow-lg'
                          : 'text-white hover:bg-white/20'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="hidden sm:inline">Gráficos</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              {activeView === 'tables' ? (
                <TableView
                  sections={excelData.sections}
                  periodLabel={excelData.periodLabel}
                  version={excelData.version}
                  uploadedAt={excelData.uploadedAt}
                />
              ) : activeView === 'ebitda' ? (
                <div className="flex-1 overflow-auto p-6 md:p-8">
                  <EbitdaDashboard sections={excelData.sections} />
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <GraphView
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    availablePeriods={periods.map(p => p.period)}
                    sections={excelData.sections}
                  />
                </div>
              )}
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
