'use client';

import { useState, useEffect } from 'react';

interface User {
  _id: string;
  name: string;
  sucursales: string[];
  createdAt: string;
}

interface UserManagementProps {
  selectedUserId: string | null;
  selectedUserName: string;
  onUserChange: (userId: string, userName: string) => void;
}

export default function UserManagement({ 
  selectedUserId, 
  selectedUserName,
  onUserChange 
}: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newSucursales, setNewSucursales] = useState<string[]>([]);
  const [sucursalInput, setSucursalInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Estados para edición de usuario
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editSucursales, setEditSucursales] = useState<string[]>([]);
  const [editSucursalInput, setEditSucursalInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Cargar usuarios
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      if (result.success) {
        setUsers(result.users || []);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSucursal = () => {
    const trimmed = sucursalInput.trim();
    if (trimmed && !newSucursales.includes(trimmed)) {
      setNewSucursales([...newSucursales, trimmed]);
      setSucursalInput('');
    }
  };

  const handleRemoveSucursal = (sucursal: string) => {
    setNewSucursales(newSucursales.filter(s => s !== sucursal));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserName.trim()) {
      setMessage({ type: 'error', text: 'El nombre de usuario es requerido' });
      return;
    }

    if (newSucursales.length === 0) {
      setMessage({ type: 'error', text: 'Debe agregar al menos una unidad de negocio' });
      return;
    }

    setIsCreating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newUserName.trim(),
          sucursales: newSucursales
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '¡Usuario creado exitosamente!' });
        setNewUserName('');
        setNewSucursales([]);
        setSucursalInput('');
        setShowCreateForm(false);
        fetchUsers();
        
        // Seleccionar automáticamente el nuevo usuario
        if (result.user) {
          onUserChange(result.user._id, result.user.name);
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al crear usuario' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear usuario' });
      console.error('Error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectUser = (user: User) => {
    onUserChange(user._id, user.name);
    setMessage({ type: 'success', text: `Usuario "${user.name}" seleccionado` });
  };

  const handleEditUser = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUser(user);
    setEditSucursales([...user.sucursales]);
    setEditSucursalInput('');
    setMessage(null);
  };

  const handleAddEditSucursal = () => {
    const trimmed = editSucursalInput.trim();
    if (trimmed && !editSucursales.includes(trimmed)) {
      setEditSucursales([...editSucursales, trimmed]);
      setEditSucursalInput('');
    }
  };

  const handleRemoveEditSucursal = (sucursal: string) => {
    setEditSucursales(editSucursales.filter(s => s !== sucursal));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    if (editSucursales.length === 0) {
      setMessage({ type: 'error', text: 'Debe tener al menos una unidad de negocio' });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: editingUser._id,
          sucursales: editSucursales
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Sucursales actualizadas exitosamente' });
        setEditingUser(null);
        setEditSucursales([]);
        setEditSucursalInput('');
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al actualizar usuario' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar usuario' });
      console.error('Error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-300 text-green-800' 
            : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="font-medium">{message.text}</p>
          </div>
        </div>
      )}

      {/* Usuario actual */}
      {selectedUserId && (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-full">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-indigo-600 font-medium">Usuario Activo</p>
              <p className="text-lg font-bold text-indigo-900">{selectedUserName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Botón crear usuario */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Nuevo Usuario
        </button>
      )}

      {/* Formulario crear usuario */}
      {showCreateForm && (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Ej: Nombre_del_Cliente"
                className="w-full px-4 py-3 text-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-gray-500">
                El nombre debe ser único y sin espacios (usa guiones bajos si es necesario)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Unidades de Negocio / Sucursales
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sucursalInput}
                  onChange={(e) => setSucursalInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSucursal();
                    }
                  }}
                  placeholder="Ej: Sevilla, Labranza, Casa_Matriz..."
                  className="flex-1 px-4 py-3 text-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isCreating}
                />
                <button
                  type="button"
                  onClick={handleAddSucursal}
                  disabled={!sucursalInput.trim() || isCreating}
                  className="px-6 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Presiona Enter o haz clic en Agregar. Debe tener al menos 1 sucursal.
              </p>

              {/* Lista de sucursales agregadas */}
              {newSucursales.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {newSucursales.map((sucursal) => (
                    <div
                      key={sucursal}
                      className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full flex items-center gap-2 border border-indigo-300"
                    >
                      <span className="font-medium text-sm">{sucursal}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSucursal(sucursal)}
                        disabled={isCreating}
                        className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating || !newUserName.trim() || newSucursales.length === 0}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Crear Usuario
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewUserName('');
                  setNewSucursales([]);
                  setSucursalInput('');
                  setMessage(null);
                }}
                disabled={isCreating}
                className="px-6 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuarios */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Usuarios Disponibles</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-500 mt-2">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-600 font-medium">No hay usuarios creados</p>
            <p className="text-sm text-gray-500 mt-1">Crea tu primer usuario para comenzar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user._id} className="relative">
                <button
                  onClick={() => handleSelectUser(user)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedUserId === user._id
                      ? 'bg-indigo-50 border-indigo-500 shadow-md'
                      : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedUserId === user._id ? 'bg-indigo-500' : 'bg-gray-200'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        selectedUserId === user._id ? 'text-white' : 'text-gray-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${
                        selectedUserId === user._id ? 'text-indigo-900' : 'text-gray-900'
                      }`}>
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(user.createdAt).toLocaleDateString('es-CL')}
                      </p>
                      {user.sucursales && user.sucursales.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.sucursales.map((sucursal) => (
                            <span
                              key={sucursal}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                            >
                              {sucursal}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedUserId === user._id && (
                      <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
                {/* Botón de editar */}
                <button
                  onClick={(e) => handleEditUser(user, e)}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
                  title="Editar sucursales"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición de sucursales */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Editar Sucursales - {editingUser.name}
                </h3>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditSucursales([]);
                    setEditSucursalInput('');
                    setMessage(null);
                  }}
                  disabled={isUpdating}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Unidades de Negocio / Sucursales
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editSucursalInput}
                      onChange={(e) => setEditSucursalInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEditSucursal();
                        }
                      }}
                      placeholder="Ej: Sucursal_Nueva..."
                      className="flex-1 px-4 py-3 text-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isUpdating}
                    />
                    <button
                      type="button"
                      onClick={handleAddEditSucursal}
                      disabled={!editSucursalInput.trim() || isUpdating}
                      className="px-6 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Agregar
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Presiona Enter o haz clic en Agregar. Debe tener al menos 1 sucursal.
                  </p>

                  {/* Lista de sucursales */}
                  {editSucursales.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {editSucursales.map((sucursal) => (
                        <div
                          key={sucursal}
                          className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full flex items-center gap-2 border border-indigo-300"
                        >
                          <span className="font-medium text-sm">{sucursal}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditSucursal(sucursal)}
                            disabled={isUpdating}
                            className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdating || editSucursales.length === 0}
                    className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Guardar Cambios
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setEditSucursales([]);
                      setEditSucursalInput('');
                      setMessage(null);
                    }}
                    disabled={isUpdating}
                    className="px-6 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
