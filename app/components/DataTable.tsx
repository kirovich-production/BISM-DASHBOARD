'use client';

import { Fragment } from 'react';
import { ExcelRow } from '@/types';

interface DataTableProps {
  data: ExcelRow[];
  sectionName: string;
  visibleMonths?: string[]; // Nuevos props para filtrado
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DataTable({ data, sectionName, visibleMonths }: DataTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No hay datos disponibles para {sectionName}</p>
      </div>
    );
  }

  // Determinar qué meses mostrar
  const displayMonths = visibleMonths && visibleMonths.length > 0 ? visibleMonths : MONTHS;

  const formatNumber = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    const strValue = String(value);
    
    // Si contiene #DIV/0! u otro error
    if (strValue.includes('#') || strValue.includes('DIV')) return strValue;
    
    const numValue = typeof value === 'number' ? value : parseFloat(strValue.replace(/,/g, ''));
    
    if (isNaN(numValue)) return strValue;
    
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const formatPercentage = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    const strValue = String(value);
    
    // Si contiene #DIV/0! u otro error
    if (strValue.includes('#') || strValue.includes('DIV')) return strValue;
    
    // Si ya tiene el símbolo %
    if (strValue.includes('%')) return strValue;
    
    const numValue = typeof value === 'number' ? value : parseFloat(strValue.replace(/,/g, ''));
    
    if (isNaN(numValue)) return strValue;
    
    return `${numValue.toFixed(2)}%`;
  };

  const isTotal = (item: string): boolean => {
    const normalized = item.toLowerCase();
    return normalized.includes('total') || normalized.includes('utilidad');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {/* Fila de meses */}
            <tr className="bg-indigo-600 text-white">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold sticky left-0 bg-indigo-600 z-10">
                Ítem
              </th>
              {displayMonths.map((month) => (
                <th
                  key={month}
                  colSpan={2}
                  className="border border-gray-300 px-2 py-3 text-center font-semibold"
                >
                  {month}
                </th>
              ))}
              <th
                colSpan={3}
                className="border border-gray-300 px-2 py-3 text-center font-semibold"
              >
                ANUAL
              </th>
            </tr>
            {/* Fila de Monto / % */}
            <tr className="bg-indigo-500 text-white">
              <th className="border border-gray-300 px-4 py-2 text-left text-xs sticky left-0 bg-indigo-500 z-10">
                
              </th>
              {displayMonths.map((month) => (
                <Fragment key={month}>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs">
                    Monto
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs">
                    %
                  </th>
                </Fragment>
              ))}
              <th className="border border-gray-300 px-2 py-2 text-center text-xs">
                Monto
              </th>
              <th className="border border-gray-300 px-2 py-2 text-center text-xs">
                %
              </th>
              <th className="border border-gray-300 px-2 py-2 text-center text-xs">
                Promedio
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const itemName = row.Item || '';
              const isTotalRow = isTotal(itemName);
              
              return (
                <tr
                  key={index}
                  className={`
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    ${isTotalRow ? 'bg-yellow-50 font-bold' : ''}
                    hover:bg-blue-50 transition-colors
                  `}
                >
                  <td className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-medium sticky left-0 bg-inherit z-10">
                    {itemName}
                  </td>
                  {displayMonths.map((month) => {
                    const monthKey = month.charAt(0).toUpperCase() + month.slice(1);
                    const montoKey = `${monthKey} Monto`;
                    const percentKey = `${monthKey} %`;
                    
                    return (
                      <Fragment key={`${index}-${month}`}>
                        <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium">
                          {formatNumber(row[montoKey])}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium">
                          {formatPercentage(row[percentKey])}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium">
                    {formatNumber(row['ANUAL Monto'])}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium">
                    {formatPercentage(row['ANUAL %'])}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium">
                    {formatNumber(row['ANUAL Promedio'])}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
