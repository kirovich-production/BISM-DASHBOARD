'use client';

import { useState, useMemo } from 'react';
import QuarterSelector from './QuarterSelector';
import MonthComparisonSelector from './MonthComparisonSelector';

interface TableViewControlsProps {
  onViewChange: (
    mode: 'all' | 'quarter' | 'comparison',
    data: { quarter?: string; month1?: string; month2?: string }
  ) => void;
}

export default function TableViewControls({
  onViewChange,
}: TableViewControlsProps) {
  const [viewMode, setViewMode] = useState<'all' | 'quarter' | 'comparison'>('all');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [comparisonMonth1, setComparisonMonth1] = useState('');
  const [comparisonMonth2, setComparisonMonth2] = useState('');

  // Generar opciones directamente
  const quarterOptions = useMemo(() => [
    { value: 'Q1', label: 'Q1 (Ene-Mar)', months: ['Enero', 'Febrero', 'Marzo'] },
    { value: 'Q2', label: 'Q2 (Abr-Jun)', months: ['Abril', 'Mayo', 'Junio'] },
    { value: 'Q3', label: 'Q3 (Jul-Sep)', months: ['Julio', 'Agosto', 'Septiembre'] },
    { value: 'Q4', label: 'Q4 (Oct-Dic)', months: ['Octubre', 'Noviembre', 'Diciembre'] }
  ], []);

  const monthOptions = useMemo(() => [
    { value: 'Enero', label: 'Enero' },
    { value: 'Febrero', label: 'Febrero' },
    { value: 'Marzo', label: 'Marzo' },
    { value: 'Abril', label: 'Abril' },
    { value: 'Mayo', label: 'Mayo' },
    { value: 'Junio', label: 'Junio' },
    { value: 'Julio', label: 'Julio' },
    { value: 'Agosto', label: 'Agosto' },
    { value: 'Septiembre', label: 'Septiembre' },
    { value: 'Octubre', label: 'Octubre' },
    { value: 'Noviembre', label: 'Noviembre' },
    { value: 'Diciembre', label: 'Diciembre' }
  ], []);

  const handleModeChange = (mode: 'all' | 'quarter' | 'comparison') => {
    setViewMode(mode);
    
    // Reset selections
    if (mode !== 'quarter') setSelectedQuarter('');
    if (mode !== 'comparison') {
      setComparisonMonth1('');
      setComparisonMonth2('');
    }

    // Notificar cambio
    if (mode === 'all') {
      onViewChange('all', {});
    } else if (mode === 'quarter') {
      onViewChange('quarter', { quarter: selectedQuarter });
    } else {
      onViewChange('comparison', { month1: comparisonMonth1, month2: comparisonMonth2 });
    }
  };

  const handleQuarterChange = (value: string) => {
    setSelectedQuarter(value);
    onViewChange('quarter', { quarter: value });
  };

  const handleMonth1Change = (value: string) => {
    setComparisonMonth1(value);
    onViewChange('comparison', { month1: value, month2: comparisonMonth2 });
  };

  const handleMonth2Change = (value: string) => {
    setComparisonMonth2(value);
    onViewChange('comparison', { month1: comparisonMonth1, month2: value });
  };

  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleModeChange('all')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Vista Completa
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleModeChange('quarter')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'quarter'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Trimestre
          </button>
          {viewMode === 'quarter' && (
            <QuarterSelector
              options={quarterOptions}
              value={selectedQuarter}
              onChange={handleQuarterChange}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleModeChange('comparison')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'comparison'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Comparar
          </button>
          {viewMode === 'comparison' && (
            <MonthComparisonSelector
              options={monthOptions}
              month1={comparisonMonth1}
              month2={comparisonMonth2}
              onMonth1Change={handleMonth1Change}
              onMonth2Change={handleMonth2Change}
            />
          )}
        </div>
      </div>
    </div>
  );
}
