'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';

interface UserSelectorProps {
  onUserChange: (userId: string, userName: string) => void;
  selectedUserId?: string | null;
}

export default function UserSelector({ onUserChange, selectedUserId }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserInput, setShowNewUserInput] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(selectedUserId || '');

  // Cargar usuarios al montar
  useEffect(() => {
    fetchUsers();
  }, []);

  // Si hay un usuario seleccionado externamente, actualizarlo
  useEffect(() => {
    if (selectedUserId && selectedUserId !== currentUserId) {
      setCurrentUserId(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success && result.users) {
        setUsers(result.users);
        
        // Si no hay usuario seleccionado y hay usuarios, seleccionar el primero
        if (!currentUserId && result.users.length > 0) {
          const firstUser = result.users[0];
          setCurrentUserId(firstUser.id);
          onUserChange(firstUser.id, firstUser.name);
        }
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUserId(userId);
      onUserChange(userId, user.name);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      alert('Por favor ingresa un nombre de usuario');
      return;
    }

    setCreatingUser(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName.trim() })
      });

      const result = await response.json();

      if (result.success && result.user) {
        // Actualizar lista de usuarios
        setUsers([...users, result.user]);
        
        // Seleccionar el nuevo usuario
        setCurrentUserId(result.user.id);
        onUserChange(result.user.id, result.user.name);
        
        // Resetear formulario
        setNewUserName('');
        setShowNewUserInput(false);
        
        alert(`✅ Usuario "${result.user.name}" creado exitosamente`);
      } else {
        alert(`❌ Error: ${result.error || 'No se pudo crear el usuario'}`);
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('❌ Error al crear el usuario');
    } finally {
      setCreatingUser(false);
    }
  };

  const selectedUser = users.find(u => u.id === currentUserId);

  if (loading) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          👤 Usuario
        </label>
        <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        👤 Usuario <span className="text-red-500">*</span>
      </label>

      {/* Selector de usuario existente */}
      {!showNewUserInput && (
        <div className="space-y-3">
          <select
            value={currentUserId}
            onChange={(e) => handleUserSelect(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              bg-white text-gray-900 font-medium shadow-sm
              hover:border-indigo-400 transition-colors"
          >
            <option value="">-- Seleccionar Usuario --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewUserInput(true)}
            className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg
              hover:bg-green-200 transition-colors font-medium text-sm
              flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Crear Nuevo Usuario
          </button>
        </div>
      )}

      {/* Formulario crear nuevo usuario */}
      {showNewUserInput && (
        <div className="space-y-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre del nuevo usuario
            </label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-green-500 focus:border-green-500
                text-gray-900 font-medium placeholder:text-gray-400"
              disabled={creatingUser}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={creatingUser || !newUserName.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg
                hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors font-medium text-sm"
            >
              {creatingUser ? 'Creando...' : 'Crear Usuario'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewUserInput(false);
                setNewUserName('');
              }}
              disabled={creatingUser}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                hover:bg-gray-300 disabled:cursor-not-allowed
                transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Confirmación visual del usuario seleccionado */}
      {selectedUser && !showNewUserInput && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
              {selectedUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Usuario seleccionado:</p>
              <p className="text-lg font-bold text-indigo-900">{selectedUser.name}</p>
            </div>
            <div className="text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Advertencia si no hay usuario seleccionado */}
      {!currentUserId && !showNewUserInput && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Debe seleccionar un usuario</p>
              <p className="text-xs text-red-600">Esto es obligatorio para cargar el archivo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
