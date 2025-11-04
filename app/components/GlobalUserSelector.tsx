'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';

interface GlobalUserSelectorProps {
  onUserChange: (userId: string, userName: string) => void;
  selectedUserId?: string | null;
}

export default function GlobalUserSelector({ onUserChange, selectedUserId }: GlobalUserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success && result.users) {
        setUsers(result.users);
        
        // Si no hay usuario seleccionado y hay usuarios, seleccionar el primero
        if (!selectedUserId && result.users.length > 0) {
          const firstUser = result.users[0];
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
      onUserChange(user.id, user.name);
      setIsOpen(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        <div className="h-4 w-24 bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-indigo-200 
          rounded-lg hover:border-indigo-400 transition-all shadow-sm
          hover:shadow-md group"
      >
        {selectedUser ? (
          <>
            <div className="bg-indigo-600 text-white rounded-full w-8 h-8 
              flex items-center justify-center font-bold text-sm
              group-hover:scale-110 transition-transform">
              {selectedUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">Usuario Activo</p>
              <p className="text-sm font-bold text-gray-900">{selectedUser.name}</p>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            <div className="bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">Seleccionar Usuario</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-indigo-200 
            rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200">
              <p className="text-xs font-semibold text-indigo-900">Seleccionar Usuario</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-indigo-50 
                    transition-colors text-left border-b border-gray-100 last:border-0
                    ${selectedUserId === user.id ? 'bg-indigo-100' : ''}`}
                >
                  <div className={`rounded-full w-10 h-10 flex items-center justify-center 
                    font-bold text-sm ${selectedUserId === user.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700'}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedUserId === user.id ? '✓ Activo' : 'Cambiar a este usuario'}
                    </p>
                  </div>
                  {selectedUserId === user.id && (
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
