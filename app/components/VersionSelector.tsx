'use client';

import { useState, useEffect, useRef } from 'react';
import type { Period } from '@/types';

interface VersionSelectorProps {
  selectedPeriod: string | null;
  onVersionChange: (version: number | null) => void;
  onVersionDeleted?: () => void;
}

interface VersionInfo {
  _id: string;
  version: number;
  fileName: string;
  uploadedAt: string;
}

export default function VersionSelector({ selectedPeriod, onVersionChange, onVersionDeleted }: VersionSelectorProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const onVersionChangeRef = useRef(onVersionChange);

  // Actualizar la referencia cuando cambie la función
  useEffect(() => {
    onVersionChangeRef.current = onVersionChange;
  }, [onVersionChange]);

  useEffect(() => {
    const fetchVersions = async () => {
      if (!selectedPeriod) {
        setVersions([]);
        setSelectedVersion(null);
        onVersionChangeRef.current(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/periods');
        const result = await response.json();
        
        if (result.success && result.periods) {
          const periodData = result.periods.find(
            (p: Period) => p.period === selectedPeriod
          );
          
          if (periodData && periodData.versions && periodData.versions.length > 0) {
            setVersions(periodData.versions);
            
            // Auto-seleccionar la versión más reciente
            const latestVersion = periodData.versions[0].version;
            setSelectedVersion(latestVersion);
            onVersionChangeRef.current(latestVersion);
          } else {
            setVersions([]);
            setSelectedVersion(null);
            onVersionChangeRef.current(null);
          }
        }
      } catch (error) {
        console.error('Error al cargar versiones:', error);
        setVersions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [selectedPeriod]);

  const handleVersionChange = (version: number) => {
    setSelectedVersion(version);
    onVersionChangeRef.current(version);
  };

  const handleDeleteVersion = async (e: React.MouseEvent, versionId: string, versionNumber: number) => {
    e.stopPropagation(); // Evitar que se seleccione la versión al hacer clic en eliminar
    
    if (!confirm(`¿Estás seguro de eliminar la versión ${versionNumber}?`)) {
      return;
    }

    setDeletingId(versionId);
    try {
      const response = await fetch(`/api/delete-document?id=${versionId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Recargar las versiones
        const periodsResponse = await fetch('/api/periods');
        const periodsResult = await periodsResponse.json();
        
        if (periodsResult.success && periodsResult.periods) {
          const periodData = periodsResult.periods.find(
            (p: Period) => p.period === selectedPeriod
          );
          
          if (periodData && periodData.versions && periodData.versions.length > 0) {
            setVersions(periodData.versions);
            
            // Si se eliminó la versión seleccionada, seleccionar la más reciente
            if (selectedVersion === versionNumber) {
              const latestVersion = periodData.versions[0].version;
              setSelectedVersion(latestVersion);
              onVersionChangeRef.current(latestVersion);
            }
          } else {
            setVersions([]);
            setSelectedVersion(null);
            onVersionChangeRef.current(null);
          }
        }

        // Notificar al componente padre
        if (onVersionDeleted) {
          onVersionDeleted();
        }
      } else {
        alert(`Error al eliminar: ${result.error}`);
      }
    } catch (error) {
      console.error('Error al eliminar versión:', error);
      alert('Error al eliminar la versión');
    } finally {
      setDeletingId(null);
    }
  };

  if (!selectedPeriod) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-sm text-gray-600">Cargando versiones...</span>
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ No hay datos disponibles para este período.
        </p>
      </div>
    );
  }

  if (versions.length === 1) {
    const version = versions[0];
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">
              ✅ 1 versión disponible
            </p>
            <p className="text-xs text-green-600 mt-1">
              <strong>Archivo:</strong> {version.fileName}
            </p>
            <p className="text-xs text-green-600">
              <strong>Subido:</strong> {new Date(version.uploadedAt).toLocaleString('es-MX')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          📦 Versiones disponibles ({versions.length})
        </h3>
        <span className="text-xs text-gray-500">
          Selecciona una versión para visualizar
        </span>
      </div>

      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version._id}
            onClick={() => handleVersionChange(version.version)}
            className={`
              p-3 rounded-lg border-2 cursor-pointer transition-all relative
              ${selectedVersion === version.version
                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-25'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                    ${selectedVersion === version.version
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                    }
                  `}>
                    v{version.version}
                  </span>
                  {version.version === versions[0].version && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Más reciente
                    </span>
                  )}
                  
                  {/* Botón eliminar */}
                  <button
                    onClick={(e) => handleDeleteVersion(e, version._id, version.version)}
                    disabled={deletingId === version._id}
                    className="ml-auto p-1.5 rounded-full hover:bg-red-100 transition-colors group"
                    title="Eliminar versión"
                  >
                    {deletingId === version._id ? (
                      <svg className="animate-spin h-4 w-4 text-red-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-700 mt-2 font-medium">
                  {version.fileName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(version.uploadedAt).toLocaleString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {selectedVersion === version.version && (
                <div className="flex-shrink-0 ml-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
