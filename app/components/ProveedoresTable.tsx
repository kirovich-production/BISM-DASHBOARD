'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Proveedor } from '@/types';

export default function ProveedoresTable() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar proveedores
  useEffect(() => {
    loadProveedores();
  }, []);

  const loadProveedores = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/proveedores');
      const result = await response.json();
      
      if (result.success) {
        setProveedores(result.proveedores || []);
      }
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar proveedores
  const filteredProveedores = useMemo(() => {
    if (!searchTerm) return proveedores;
    
    const term = searchTerm.toLowerCase();
    return proveedores.filter(p => 
      p.rut.toLowerCase().includes(term) ||
      p.nombre.toLowerCase().includes(term)
    );
  }, [proveedores, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Cargando proveedores...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por RUT o Nombre..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredProveedores.length} proveedores
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredProveedores.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No hay proveedores registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-600 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Centro de Costos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Tipo Cuenta</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Observaciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProveedores.map((proveedor, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{proveedor.rut}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{proveedor.nombre}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {proveedor.centroCosto ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {proveedor.centroCosto}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {proveedor.tipoCuenta ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {proveedor.tipoCuenta}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {proveedor.observaciones || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
