'use client';

import { useState, useEffect, useCallback } from 'react';
import TabNavigation from './components/TabNavigation';
import DataTable from './components/DataTable';
import PeriodInput from './components/PeriodInput';
import VersionSelector from './components/VersionSelector';
import { UploadResponse, UploadedDocument, Period } from '@/types';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadedData, setUploadedData] = useState<UploadResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'Labranza' | 'Sevilla' | 'Consolidados'>('Labranza');
  const [excelData, setExcelData] = useState<UploadedDocument | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [uploadPeriod, setUploadPeriod] = useState<string>('');
  const [uploadPeriodLabel, setUploadPeriodLabel] = useState<string>('');

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

  const handleVersionChange = useCallback((version: number | null) => {
    setSelectedVersion(version);
  }, []);

  const handleVersionDeleted = useCallback(() => {
    // Recargar períodos después de eliminar una versión
    fetchPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Obtener datos de la sección activa
  const activeSection = excelData?.sections.find(s => s.name === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📊 BISM Dashboard
          </h1>
          <p className="text-gray-600">
            Sistema de análisis financiero - Carga y visualización de datos
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
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

        {/* Version Selector */}
        {selectedPeriod && (
          <div className="mb-6">
            <VersionSelector 
              selectedPeriod={selectedPeriod}
              onVersionChange={handleVersionChange}
              onVersionDeleted={handleVersionDeleted}
            />
          </div>
        )}

        {/* Data Visualization */}
        {excelData && selectedPeriod && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                 {excelData.fileName}
              </h2>
              {excelData.fileName && (
                <h3 className="text-sm text-gray-600 mt-2 font-medium">
                  Datos Financieros
                </h3>
              )}
            </div>

            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">
                  Período: <strong>{excelData.periodLabel}</strong>
                </p>
                {excelData.version && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                    Versión {excelData.version}
                  </span>
                )}
              </div>
              {excelData.uploadedAt && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    Cargado: {new Date(excelData.uploadedAt).toLocaleString('es-CL')}
                  </p>
                </div>
              )}
            </div>

            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {loadingData ? (
              <div className="flex justify-center items-center py-12">
                <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              <DataTable 
                data={activeSection?.data || []} 
                sectionName={activeTab}
              />
            )}
          </div>
        )}

        {!excelData && !loadingData && periods.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">
              No hay datos disponibles. Por favor, carga un archivo Excel.
            </p>
          </div>
        )}

        {!excelData && !loadingData && periods.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-indigo-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg">
              Selecciona un período para visualizar los datos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
