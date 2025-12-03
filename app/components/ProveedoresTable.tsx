'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Proveedor } from '@/types';

interface ProveedoresTableProps {
  userId: string | null;
  sucursal: string | null;
  periodo: string | null;
}

export default function ProveedoresTable({ userId, sucursal, periodo }: ProveedoresTableProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingObservaciones, setEditingObservaciones] = useState('');

  const loadProveedores = useCallback(async () => {
    if (!userId || !sucursal || !periodo) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/proveedores-excel?userId=${userId}&sucursal=${sucursal}&periodo=${periodo}`);
      const result = await response.json();
      
      if (result.success) {
        setProveedores(result.proveedores || []);
      }
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sucursal, periodo]);

  // Cargar proveedores cuando cambien userId, sucursal o periodo
  useEffect(() => {
    if (userId && sucursal && periodo) {
      loadProveedores();
    } else {
      setProveedores([]);
      setIsLoading(false);
    }
  }, [userId, sucursal, periodo, loadProveedores]);

  const handleEditClick = (index: number, proveedor: Proveedor) => {
    setEditingIndex(index);
    setEditingObservaciones(proveedor.observaciones || '');
  };

  const handleSaveObservaciones = async (rut: string) => {
    if (!userId || !sucursal || !periodo) return;
    
    try {
      const response = await fetch('/api/proveedores-excel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          sucursal,
          periodo,
          rut, 
          observaciones: editingObservaciones 
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Actualizar estado local
        setProveedores(prev => prev.map(p => 
          p.rut === rut ? { ...p, observaciones: editingObservaciones } : p
        ));
        setEditingIndex(null);
        setEditingObservaciones('');
      } else {
        alert('Error al guardar observaciones: ' + (result.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al actualizar observaciones:', error);
      alert('Error de conexión al guardar observaciones');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingObservaciones('');
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

  if (!userId || !sucursal || !periodo) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-sm text-yellow-700 font-medium">
          Selecciona un usuario, sucursal y período para visualizar los proveedores
        </p>
      </div>
    );
  }

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
              className="w-full px-4 text-gray-900 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
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
                  <tr key={`${proveedor.rut}-${idx}`} className="hover:bg-gray-50 group">
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
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {editingIndex === idx ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingObservaciones}
                            onChange={(e) => setEditingObservaciones(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-gray-900 focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveObservaciones(proveedor.rut);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            onClick={() => handleSaveObservaciones(proveedor.rut)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="truncate max-w-xs">{proveedor.observaciones || '-'}</span>
                          <button
                            onClick={() => handleEditClick(idx, proveedor)}
                            className="ml-2 px-2 py-1 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity text-xs whitespace-nowrap"
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      )}
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
