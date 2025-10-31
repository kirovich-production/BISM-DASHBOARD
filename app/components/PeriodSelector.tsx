'use client';

import { Period } from '@/types';

interface PeriodSelectorProps {
  periods: Period[];
  selectedPeriod: string | null;
  onPeriodChange: (period: string) => void;
  onDelete: (id: string, periodLabel: string) => void;
  loading?: boolean;
}

export default function PeriodSelector({ 
  periods, 
  selectedPeriod, 
  onPeriodChange, 
  onDelete,
  loading = false 
}: PeriodSelectorProps) {
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (periods.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          📅 Seleccionar Período
        </h3>
        <span className="text-sm text-gray-500">
          {periods.length} período{periods.length !== 1 ? 's' : ''} disponible{periods.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periods.map((period) => (
          <div
            key={period._id}
            className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedPeriod === period.period
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300 bg-white'
            }`}
            onClick={() => onPeriodChange(period.period)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className={`font-semibold mb-1 ${
                  selectedPeriod === period.period ? 'text-indigo-700' : 'text-gray-800'
                }`}>
                  {period.periodLabel}
                </h4>
                <p className="text-xs text-gray-500 mb-2">
                  {period.fileName}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(period.uploadedAt).toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Estás seguro de eliminar el período "${period.periodLabel}"?`)) {
                    onDelete(period._id!, period.periodLabel);
                  }
                }}
                className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                title="Eliminar período"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {selectedPeriod === period.period && (
              <div className="absolute top-2 right-2">
                <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
