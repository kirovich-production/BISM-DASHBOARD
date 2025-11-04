'use client';

import React from 'react';
import { EERRData, EERRCategory, EERRRow } from '@/types';

interface SevillaTableProps {
  data: EERRData | null;
  periodLabel: string;
  version?: number;
  uploadedAt?: string | Date;
}

export default function SevillaTable({ data, periodLabel, version, uploadedAt }: SevillaTableProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay datos disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron datos de EERR SEVILLA para el período seleccionado.
          </p>
        </div>
      </div>
    );
  }

  // Detectar tipos de columnas disponibles
  const getColumnTypes = (): { type: 'Monto' | '%' | 'Promedio', label: string }[] => {
    const columnTypes: { type: 'Monto' | '%' | 'Promedio', label: string }[] = [];
    
    // Buscar en la primera categoría con datos
    for (const category of data.categories) {
      if (category.rows.length > 0) {
        const firstRow = category.rows[0];
        const firstMonth = data.months[0];
        
        if (firstRow[`${firstMonth} Monto`] !== undefined) {
          columnTypes.push({ type: 'Monto', label: 'Monto' });
        }
        if (firstRow[`${firstMonth} %`] !== undefined) {
          columnTypes.push({ type: '%', label: '%' });
        }
        if (firstRow[`${firstMonth} Promedio`] !== undefined) {
          columnTypes.push({ type: 'Promedio', label: 'Promedio' });
        }
        break;
      }
    }
    
    // Valores por defecto si no se detecta nada
    if (columnTypes.length === 0) {
      columnTypes.push({ type: 'Monto', label: 'Monto' });
      columnTypes.push({ type: '%', label: '%' });
    }
    
    return columnTypes;
  };

  const columnTypes = getColumnTypes();

  const formatNumber = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return `${num.toFixed(1)}%`;
  };

  const formatValue = (value: string | number | undefined, type: 'Monto' | '%' | 'Promedio'): string => {
    if (type === '%') {
      return formatPercentage(value);
    }
    return formatNumber(value);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header fijo */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">EERR Sevilla</h1>
            <p className="text-sm text-gray-600 mt-1">
              Período: {periodLabel}
              {version && ` • Versión ${version}`}
              {uploadedAt && ` • ${new Date(uploadedAt).toLocaleDateString('es-CL')}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla continua única */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full inline-block align-middle">
          <table className="min-w-full divide-y divide-gray-300">
            {/* Header de la tabla */}
            <thead className="bg-indigo-600 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500">
                  Concepto
                </th>
                {data.months.map((month: string, monthIdx: number) => (
                  <th
                    key={monthIdx}
                    scope="col"
                    colSpan={columnTypes.length}
                    className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500"
                  >
                    {month}
                  </th>
                ))}
              </tr>
              <tr>
                <th scope="col" className="px-6 py-2 bg-indigo-700 border-r border-indigo-500"></th>
                {data.months.map((month: string, monthIdx: number) => (
                  <React.Fragment key={monthIdx}>
                    {columnTypes.map((colType: { type: 'Monto' | '%' | 'Promedio', label: string }, colIdx: number) => (
                      <th
                        key={colIdx}
                        scope="col"
                        className="px-3 py-2 text-center text-xs font-medium text-white bg-indigo-700 border-r border-indigo-600"
                      >
                        {colType.label}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Body de la tabla - CONTINUO */}
            <tbody className="bg-white divide-y divide-gray-200">
              {data.categories.flatMap((category: EERRCategory, categoryIndex: number) => [
                // FILA DE CATEGORÍA (título con estilo especial)
                <tr key={`cat-${categoryIndex}`} className="bg-gradient-to-r from-indigo-100 to-indigo-50 border-t-2 border-indigo-300">
                  <td
                    colSpan={1 + data.months.length * columnTypes.length}
                    className="px-6 py-3 text-sm font-bold text-indigo-900 uppercase tracking-wide"
                  >
                    {category.name}
                  </td>
                </tr>,

                // FILAS DE DATOS de la categoría
                ...category.rows.map((row: EERRRow, rowIndex: number) => (
                  <tr
                    key={`cat-${categoryIndex}-row-${rowIndex}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap border-r border-gray-200">
                      {row.Item}
                    </td>
                    {data.months.map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        {columnTypes.map((colType: { type: 'Monto' | '%' | 'Promedio', label: string }, colIdx: number) => {
                          const key = `${month} ${colType.type}`;
                          return (
                            <td
                              key={colIdx}
                              className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100"
                            >
                              {formatValue(row[key], colType.type)}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tr>
                )),

                // FILA DE TOTAL (si existe)
                ...(category.total ? [
                  <tr
                    key={`cat-${categoryIndex}-total`}
                    className="bg-indigo-50 font-semibold border-t-2 border-indigo-200"
                  >
                    <td className="px-6 py-3 text-sm text-indigo-900 font-bold whitespace-nowrap border-r border-indigo-200">
                      {category.total.Item}
                    </td>
                    {data.months.map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        {columnTypes.map((colType: { type: 'Monto' | '%' | 'Promedio', label: string }, colIdx: number) => {
                          const key = `${month} ${colType.type}`;
                          return (
                            <td
                              key={colIdx}
                              className="px-3 py-3 text-sm text-indigo-900 font-bold text-right whitespace-nowrap border-r border-indigo-100"
                            >
                              {formatValue(category.total![key], colType.type)}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tr>
                ] : [])
              ])}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
