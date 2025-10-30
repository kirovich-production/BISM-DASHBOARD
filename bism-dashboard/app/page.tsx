'use client';

import { useState, useEffect } from 'react';
import TabNavigation from './components/TabNavigation';
import DataTable from './components/DataTable';
import { UploadResponse, UploadedDocument } from '@/types';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadedData, setUploadedData] = useState<UploadResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'Labranza' | 'Sevilla' | 'Consolidados'>('Labranza');
  const [excelData, setExcelData] = useState<UploadedDocument | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  // Recargar datos después de un upload exitoso
  useEffect(() => {
    if (uploadedData?.success) {
      fetchData();
    }
  }, [uploadedData]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      
      if (result.success && result.data) {
        setExcelData(result.data);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage({ type: 'error', text: 'Por favor selecciona un archivo' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ ${result.message}. Secciones encontradas: ${result.sectionsFound.join(', ')}`
        });
        setUploadedData(result);
        setFile(null);
        // Limpiar el input file
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
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
          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label 
                htmlFor="file-input" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Cargar archivo Excel (debe contener hoja &quot;Consolidado&quot;)
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
                onClick={fetchData}
                disabled={loadingData}
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
                <p><strong>Archivo:</strong> {uploadedData.fileName}</p>
                <p><strong>Hoja:</strong> {uploadedData.sheetName}</p>
                <p><strong>Secciones:</strong> {uploadedData.sectionsFound.join(', ')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Data Visualization */}
        {excelData && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                📈 Datos Financieros
              </h2>
              {excelData.uploadedAt && (
                <p className="text-sm text-gray-500">
                  Última actualización: {new Date(excelData.uploadedAt).toLocaleString('es-CL')}
                </p>
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

        {!excelData && !loadingData && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">
              No hay datos disponibles. Por favor, carga un archivo Excel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
