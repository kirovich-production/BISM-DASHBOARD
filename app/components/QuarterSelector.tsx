'use client';

import type { QuarterOption } from './charts/useMonthlySalesData';

interface QuarterSelectorProps {
  options: QuarterOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function QuarterSelector({ 
  options, 
  value, 
  onChange,
  disabled = false 
}: QuarterSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || options.length === 0}
      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <option value="">Seleccionar trimestre</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
