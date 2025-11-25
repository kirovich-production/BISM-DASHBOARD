'use client';

import React, { useState } from 'react';
import { LibroComprasUploadResponse } from '@/types';

interface LibroComprasUploadProps {
  userId: string;
  onUploadSuccess: () => void;
}

export default function LibroComprasUpload({ userId, onUploadSuccess }: LibroComprasUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedSucursal, setSelectedSucursal] = useState<'Sevilla' | 'Labranza'>('Sevilla');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Por favor selecciona un archivo' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('sucursal', selectedSucursal);
      
      // Formato: YYYY-MM
      const periodo = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const periodLabel = `${monthNames[selectedMonth - 1]} ${selectedYear}`;
      
      formData.append('periodo', periodo);
      formData.append('periodLabel', periodLabel);

      const response = await fetch('/api/upload-libro-compras', {
        method: 'POST',
        body: formData,
      });

      const result: LibroComprasUploadResponse = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✓ ${result.message} - ${result.transaccionesCount} transacciones, ${result.proveedoresCount} proveedores actualizados`
        });
        setFile(null);
        
        // Reset file input
        const fileInput = document.getElementById('libro-compras-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Notificar éxito al componente padre
        setTimeout(() => {
          onUploadSuccess();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error al subir archivo:', error);
      setMessage({ type: 'error', text: 'Error al procesar el archivo' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Cargar Libro de Compras</h2>
      
      {/* Selector de Sucursal */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sucursal
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="Sevilla"
              checked={selectedSucursal === 'Sevilla'}
              onChange={(e) => setSelectedSucursal(e.target.value as 'Sevilla' | 'Labranza')}
              className="mr-2 w-4 h-4 text-blue-600"
              disabled={isUploading}
            />
            <span className="text-sm font-medium text-gray-700">Sevilla</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="Labranza"
              checked={selectedSucursal === 'Labranza'}
              onChange={(e) => setSelectedSucursal(e.target.value as 'Sevilla' | 'Labranza')}
              className="mr-2 w-4 h-4 text-blue-600"
              disabled={isUploading}
            />
            <span className="text-sm font-medium text-gray-700">Labranza</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Selector de Año */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Año
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              bg-white text-gray-900 font-medium shadow-sm"
            disabled={isUploading}
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Mes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mes
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              bg-white text-gray-900 font-medium shadow-sm"
            disabled={isUploading}
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Archivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Archivo Excel
          </label>
          <input
            id="libro-compras-file-input"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              bg-white text-gray-900 font-medium shadow-sm"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Información del período seleccionado */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Sucursal:</span> {selectedSucursal} | 
          <span className="font-semibold ml-2">Período:</span>{' '}
          {monthNames[selectedMonth - 1]} {selectedYear}
        </p>
      </div>

      {/* Botón de carga */}
      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          !file || isUploading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isUploading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando...
          </span>
        ) : (
          'Cargar Libro de Compras'
        )}
      </button>

      {/* Mensajes */}
      {message && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600 mb-2">
          <strong>Formato esperado del Excel:</strong>
        </p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Hoja <strong>&quot;LC&quot;</strong>: Contiene las transacciones del libro de compras</li>
          <li>Hoja <strong>&quot;CLASIFICACIÓN&quot;</strong>: Contiene el catálogo de proveedores con sus clasificaciones</li>
        </ul>
      </div>
    </div>
  );
}
