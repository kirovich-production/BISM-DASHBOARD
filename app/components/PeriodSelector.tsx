'use client';

import { useState, useMemo } from 'react';
import { Period } from '@/types';

interface PeriodSelectorProps {
  periods: Period[];
  selectedPeriod: string | null;
  onPeriodChange: (period: string) => void;
}

const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export default function PeriodSelector({ periods, selectedPeriod, onPeriodChange }: PeriodSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Estado para colapsar/expandir - Inicia contraído
  
  // Extraer años disponibles y organizar períodos por año
  const periodsByYear = useMemo(() => {
    const grouped: { [year: string]: Period[] } = {};
    
    periods.forEach(period => {
      // Extraer año del período (formato: "2025-10" o similar)
      const year = period.period.split('-')[0];
      if (!grouped[year]) {
        grouped[year] = [];
      }
      // Solo agregar si no existe ya (períodos únicos)
      if (!grouped[year].find(p => p.period === period.period)) {
        grouped[year].push(period);
      }
    });
    
    return grouped;
  }, [periods]);

  const availableYears = Object.keys(periodsByYear).sort((a, b) => parseInt(b) - parseInt(a));
  
  // Estado del año seleccionado (por defecto el más reciente)
  const [selectedYear, setSelectedYear] = useState<string>(
    selectedPeriod ? selectedPeriod.split('-')[0] : availableYears[0] || new Date().getFullYear().toString()
  );

  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  // Crear mapa de meses con datos
  const monthsWithData = useMemo(() => {
    const currentYearPeriods = periodsByYear[selectedYear] || [];
    const map: { [month: number]: Period } = {};
    currentYearPeriods.forEach(period => {
      const month = parseInt(period.period.split('-')[1]) - 1; // 0-indexed
      map[month] = period;
    });
    return map;
  }, [periodsByYear, selectedYear]);

  // Si no hay períodos disponibles
  if (availableYears.length === 0) {
    return (
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Período
          </span>
        </div>
        <p className="text-xs text-slate-500 italic">
          No hay períodos disponibles
        </p>
      </div>
    );
  }

  const handleMonthClick = (monthIndex: number) => {
    const period = monthsWithData[monthIndex];
    if (period) {
      onPeriodChange(period.period);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-slate-700">
      {/* Header - Clickeable para expandir/colapsar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 mb-3 hover:bg-slate-700/30 p-2 rounded-lg transition-all"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Período
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenido colapsable */}
      {isExpanded && (
        <>
          {/* Selector de Año */}
          <div className="mb-3 relative">
        <button
          onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-slate-200">{selectedYear}</span>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown de años */}
        {isYearDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => {
                  setSelectedYear(year);
                  setIsYearDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  year === selectedYear
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de Meses (3x4) */}
      <div className="grid grid-cols-3 gap-2">
        {MONTHS_SHORT.map((monthShort, index) => {
          const period = monthsWithData[index];
          const isSelected = period && selectedPeriod === period.period;
          const hasData = !!period;
          const hasMultipleVersions = period && period.versionCount && period.versionCount > 1;

          return (
            <button
              key={index}
              onClick={() => hasData && handleMonthClick(index)}
              disabled={!hasData}
              className={`
                relative px-2 py-3 rounded-lg text-xs font-semibold transition-all duration-200
                ${isSelected
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                  : hasData
                  ? 'bg-slate-700/70 text-slate-200 hover:bg-slate-600 hover:text-white hover:scale-105'
                  : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                }
              `}
            >
              <div className="flex flex-col items-center gap-1">
                {/* Check mark si está seleccionado */}
                {isSelected && (
                  <svg className="w-3 h-3 absolute top-1 left-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                
                <span>{monthShort}</span>
                
                {/* Badge de versión si hay múltiples */}
                {hasMultipleVersions && (
                  <span className={`absolute top-1 right-1 text-[9px] px-1 rounded-full ${
                    isSelected ? 'bg-indigo-500' : 'bg-slate-600'
                  }`}>
                    v{period.versionCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info del período seleccionado */}
      {selectedPeriod && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-300 font-medium">
            {periods.find(p => p.period === selectedPeriod)?.periodLabel}
          </p>
          {periods.find(p => p.period === selectedPeriod)?.uploadedAt && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(periods.find(p => p.period === selectedPeriod)!.uploadedAt).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </p>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
