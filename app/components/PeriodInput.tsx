'use client';

import { useState, useEffect } from 'react';
import UserSelector from './UserSelector';

interface PeriodInputProps {
  onPeriodChange: (period: string, periodLabel: string) => void;
  onUserChange: (userId: string, userName: string) => void;
  selectedUserId?: string | null;
  selectedUserName?: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function PeriodInput({ onPeriodChange, onUserChange, selectedUserId, selectedUserName }: PeriodInputProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [years, setYears] = useState<number[]>([currentYear]);
  const [loadingYears, setLoadingYears] = useState(true);

  // Obtener años dinámicos desde la BD
  useEffect(() => {
    const fetchYears = async () => {
      try {
        // Solo cargar años si hay un usuario seleccionado
        if (!selectedUserName) {
          setYears([currentYear]);
          setLoadingYears(false);
          return;
        }

        const response = await fetch(`/api/periods/years?userName=${encodeURIComponent(selectedUserName)}`);
        const result = await response.json();
        
        if (result.success && result.years) {
          setYears(result.years);
        }
      } catch (error) {
        console.error('Error al cargar años:', error);
        // Fallback a año actual
        setYears([currentYear]);
      } finally {
        setLoadingYears(false);
      }
    };

    fetchYears();
  }, [currentYear, selectedUserName]);

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    updatePeriod(month, selectedYear);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    updatePeriod(selectedMonth, year);
  };

  const updatePeriod = (month: number, year: number) => {
    const monthStr = (month + 1).toString().padStart(2, '0');
    const period = `${year}-${monthStr}`;
    const periodLabel = `${MONTHS[month]} ${year}`;
    onPeriodChange(period, periodLabel);
  };

  // Inicializar con el mes y año actual al montar el componente
  useEffect(() => {
    updatePeriod(currentMonth, currentYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Selector de Usuario */}
      <UserSelector 
        onUserChange={onUserChange}
        selectedUserId={selectedUserId}
      />

      {/* Selector de Período */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          📅 Período de la carga
        </label>
        
        <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              bg-white text-gray-900 font-medium shadow-sm"
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            disabled={loadingYears}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              bg-white text-gray-900 font-medium shadow-sm
              disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {loadingYears ? (
              <option>Cargando...</option>
            ) : (
              years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))
            )}
          </select>
        </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
          <p className="text-sm text-indigo-800">
            <strong>Período seleccionado:</strong> {MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>
      </div>
    </div>
  );
}
