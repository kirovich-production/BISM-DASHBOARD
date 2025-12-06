'use client';

import { useState } from 'react';
import UserManagement from './UserManagement';
import LibroComprasUpload from './LibroComprasUpload';

interface CargarDatosViewProps {
  selectedUserId: string | null;
  selectedUserName: string;
  userSucursales: string[];
  onUserChange: (userId: string, userName: string) => void;
}

export default function CargarDatosView({ 
  selectedUserId, 
  selectedUserName,
  userSucursales,
  onUserChange 
}: CargarDatosViewProps) {
  const [activeSection, setActiveSection] = useState<'usuarios' | 'libro-compras'>('usuarios');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Cargar Datos
          </h1>
          <p className="text-gray-600">
            Gestiona usuarios y carga archivos de Libro de Compras
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('usuarios')}
              className={`
                flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200
                ${activeSection === 'usuarios'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Gestión de Usuarios
              </div>
            </button>
            
            <button
              onClick={() => setActiveSection('libro-compras')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                activeSection === 'libro-compras'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Libro de Compras
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {activeSection === 'usuarios' ? (
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h2>
                  <p className="text-sm text-gray-600">Crea o selecciona un usuario para trabajar</p>
                </div>
              </div>
              
              <UserManagement 
                selectedUserId={selectedUserId}
                selectedUserName={selectedUserName}
                onUserChange={onUserChange}
              />
            </div>
          ) : (
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Cargar Libro de Compras</h2>
                  <p className="text-sm text-gray-600">Sube archivos Excel por sucursal</p>
                </div>
              </div>
              
              {selectedUserId ? (
                <LibroComprasUpload 
                  userId={selectedUserId}
                  userSucursales={userSucursales}
                  onUploadSuccess={() => {
                    setTimeout(() => {
                      window.location.reload();
                    }, 1500);
                  }}
                />
              ) : (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
                  <svg className="mx-auto h-16 w-16 text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-yellow-800 mb-2">
                    Usuario requerido
                  </h3>
                  <p className="text-yellow-700 mb-4">
                    Primero debes crear o seleccionar un usuario en la sección &quot;Gestión de Usuarios&quot;
                  </p>
                  <button
                    onClick={() => setActiveSection('usuarios')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Ir a Gestión de Usuarios
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
