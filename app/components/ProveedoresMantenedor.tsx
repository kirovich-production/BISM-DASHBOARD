'use client';

import { useState, useEffect } from 'react';
import { Proveedor } from '@/types';

export default function ProveedoresMantenedor() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    centroCosto: '',
    tipoCuenta: ''
  });

  // Cargar proveedores
  const loadProveedores = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/proveedores');
      const result = await response.json();
      if (result.success) {
        setProveedores(result.proveedores);
      }
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProveedores();
  }, []);

  // Filtrar proveedores por búsqueda
  const filteredProveedores = proveedores.filter(p => 
    p.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir modal para crear
  const handleCreate = () => {
    setEditingProveedor(null);
    setFormData({
      rut: '',
      nombre: '',
      centroCosto: '',
      tipoCuenta: ''
    });
    setShowModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setFormData({
      rut: proveedor.rut,
      nombre: proveedor.nombre,
      centroCosto: proveedor.centroCosto,
      tipoCuenta: proveedor.tipoCuenta
    });
    setShowModal(true);
  };

  // Guardar (crear o editar)
  const handleSave = async () => {
    try {
      const url = '/api/proveedores';
      const method = editingProveedor ? 'PUT' : 'POST';
      const body = editingProveedor 
        ? { ...formData, _id: editingProveedor._id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        setShowModal(false);
        loadProveedores();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      alert('Error al guardar proveedor');
    }
  };

  // Eliminar
  const handleDelete = async (proveedor: Proveedor) => {
    if (!confirm(`¿Estás seguro de eliminar el proveedor ${proveedor.nombre}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/proveedores?id=${proveedor._id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        loadProveedores();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      alert('Error al eliminar proveedor');
    }
  };

  return (
    <div>
      {/* Header con búsqueda y botón crear */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por RUT o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {/* Tabla de proveedores */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando proveedores...</div>
      ) : filteredProveedores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No se encontraron proveedores con ese criterio' : 'No hay proveedores registrados'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">RUT</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Centro de Costos</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo Cuenta</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.map((proveedor, idx) => (
                <tr key={proveedor._id || idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{proveedor.rut}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{proveedor.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{proveedor.centroCosto}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{proveedor.tipoCuenta}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(proveedor)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(proveedor)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RUT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="12345678-9"
                  disabled={!!editingProveedor}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centro de Costos
                </label>
                <input
                  type="text"
                  value={formData.centroCosto}
                  onChange={(e) => setFormData({ ...formData, centroCosto: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cuenta
                </label>
                <input
                  type="text"
                  value={formData.tipoCuenta}
                  onChange={(e) => setFormData({ ...formData, tipoCuenta: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tipo de cuenta"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={!formData.rut || !formData.nombre}
              >
                {editingProveedor ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
