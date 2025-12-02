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

  // Determinar qué meses mostrar detectando dinámicamente qué columnas tienen datos
  const detectAvailableMonths = (): string[] => {
    if (visibleMonths && visibleMonths.length > 0) return visibleMonths;
    
    const availableMonths: string[] = [];
    
    // Revisar cada mes para ver si tiene datos
    for (const month of MONTHS) {
      const montoKey = `${month} Monto`;
      const percentKey = `${month} %`;
      
      // Verificar si al menos una fila tiene datos para este mes
      const hasData = data.some(row => {
        const monto = (row as Record<string, unknown>)[montoKey];
        const percent = (row as Record<string, unknown>)[percentKey];
        return (monto !== undefined && monto !== null && monto !== '') ||
               (percent !== undefined && percent !== null && percent !== '');
      });
      
      if (hasData) {
        availableMonths.push(month);
      }
    }
    
    return availableMonths.length > 0 ? availableMonths : MONTHS;
  };

  const displayMonths = detectAvailableMonths();
  
  // Verificar si existe columna ANUAL
  const hasAnual = data.some(row => {
    const anualMonto = (row as Record<string, unknown>)['ANUAL Monto'];
    const anualPercent = (row as Record<string, unknown>)['ANUAL %'];
    const anualPromedio = (row as Record<string, unknown>)['ANUAL Promedio'];
    return (anualMonto !== undefined && anualMonto !== null && anualMonto !== '') ||
           (anualPercent !== undefined && anualPercent !== null && anualPercent !== '') ||
           (anualPromedio !== undefined && anualPromedio !== null && anualPromedio !== '');
  });

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

  // Verificar si el ítem está en MAYÚSCULAS (para background amarillo)
  const isUpperCaseItem = (item: string): boolean => {
    if (!item || item.trim() === '') return false;
    // Verificar que al menos tenga 3 caracteres alfabéticos en mayúsculas
    const alphaChars = item.replace(/[^A-Za-z]/g, '');
    if (alphaChars.length < 3) return false;
    // Verificar que todas las letras sean mayúsculas
    return alphaChars === alphaChars.toUpperCase();
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
              {hasAnual && (
                <th
                  colSpan={3}
                  className="border border-gray-300 px-2 py-3 text-center font-semibold bg-indigo-700"
                >
                  ANUAL
                </th>
              )}
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
              {hasAnual && (
                <>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs bg-indigo-600">
                    Monto
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs bg-indigo-600">
                    %
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs bg-indigo-600">
                    Promedio
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const itemName = row.Item || '';
              const isTotalRow = isTotal(itemName);
              const isUpperCase = isUpperCaseItem(itemName);
              
              return (
                <tr
                  key={index}
                  className={`
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    ${isTotalRow || isUpperCase ? 'bg-yellow-100 font-bold' : ''}
                    hover:bg-blue-50 transition-colors
                  `}
                >
                  <td className={`border border-gray-300 px-4 py-2 text-left text-gray-900 font-medium sticky left-0 z-10 ${
                    isTotalRow || isUpperCase ? 'bg-yellow-100' : 'bg-inherit'
                  }`}>
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
                  {hasAnual && (
                    <>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium bg-purple-50">
                        {formatNumber(row['ANUAL Monto'])}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium bg-purple-50">
                        {formatPercentage(row['ANUAL %'])}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-gray-900 font-medium bg-purple-50">
                        {formatNumber(row['ANUAL Promedio'])}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
