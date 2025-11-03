'use client';

import type { MonthOption } from './charts/useMonthlySalesData';

interface MonthComparisonSelectorProps {
  options: MonthOption[];
  month1: string;
  month2: string;
  onMonth1Change: (value: string) => void;
  onMonth2Change: (value: string) => void;
  disabled?: boolean;
}

export default function MonthComparisonSelector({
  options,
  month1,
  month2,
  onMonth1Change,
  onMonth2Change,
  disabled = false,
}: MonthComparisonSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={month1}
        onChange={(e) => onMonth1Change(e.target.value)}
        disabled={disabled || options.length === 0}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <option value="">Mes 1</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <span className="text-sm text-gray-500 font-medium">vs</span>
      
      <select
        value={month2}
        onChange={(e) => onMonth2Change(e.target.value)}
        disabled={disabled || options.length === 0}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <option value="">Mes 2</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
