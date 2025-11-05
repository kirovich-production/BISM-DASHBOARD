'use client';

import React from 'react';
import { EERRData, EERRCategory, EERRRow } from '@/types';

interface LabranzaTableProps {
  data: EERRData | null;
  periodLabel: string;
  version?: number;
  uploadedAt?: string | Date;
}

export default function LabranzaTable({ data, periodLabel, version, uploadedAt }: LabranzaTableProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay datos disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron datos de EERR LABRANZA para el período seleccionado.
          </p>
        </div>
      </div>
    );
  }

  const formatNumber = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    // Si es string, limpiar formato (remover $, comas, espacios)
    let num: number;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '').trim();
      num = parseFloat(cleaned);
    } else {
      num = value;
    }
    
    if (isNaN(num)) return '-';
    
    // Formatear con símbolo de peso chileno
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    
    // Si es string, limpiar formato (remover %, espacios)
    let num: number;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[%\s]/g, '').trim();
      num = parseFloat(cleaned);
    } else {
      num = value;
    }
    
    if (isNaN(num)) return '-';
    // Usar 2 decimales para mayor precisión
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header fijo */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-900">EERR Labranza</h1>
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
            <thead className="bg-green-600 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-green-500">
                  Concepto
                </th>
                {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                  <th
                    key={monthIdx}
                    scope="col"
                    colSpan={2}
                    className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-green-500"
                  >
                    {month}
                  </th>
                ))}
                {/* CONSOLIDADO al final */}
                <th
                  scope="col"
                  colSpan={3}
                  className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-green-500 bg-green-700"
                >
                  CONSOLIDADO
                </th>
              </tr>
              <tr>
                <th scope="col" className="px-6 py-2 bg-green-700 border-r border-green-500"></th>
                {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                  <React.Fragment key={monthIdx}>
                    <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-700 border-r border-green-600">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-700 border-r border-green-600">
                      %
                    </th>
                  </React.Fragment>
                ))}
                {/* Sub-headers CONSOLIDADO */}
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-800 border-r border-green-600">
                  Monto
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-800 border-r border-green-600">
                  %
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-white bg-green-800 border-r border-green-600">
                  Promedio
                </th>
              </tr>
            </thead>

            {/* Body de la tabla - CONTINUO */}
            <tbody className="bg-white divide-y divide-gray-200">
              {data.categories.flatMap((category: EERRCategory, categoryIndex: number) => [
                // FILA DE CATEGORÍA (título con estilo especial)
                <tr key={`cat-${categoryIndex}`} className="bg-gradient-to-r from-green-100 to-green-50 border-t-2 border-green-300">
                  <td
                    colSpan={1 + (data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).length * 2) + 3}
                    className="px-6 py-3 text-sm font-bold text-green-900 uppercase tracking-wide"
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
                    {/* Meses normales (solo Monto y %) */}
                    {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                          {formatNumber(row[`${month} Monto`])}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                          {formatPercentage(row[`${month} %`])}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* CONSOLIDADO (Monto, %, Promedio) */}
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-green-50">
                      {formatNumber(row['CONSOLIDADO Monto'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-green-50">
                      {formatPercentage(row['CONSOLIDADO %'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-right whitespace-nowrap border-r border-gray-100 bg-green-50">
                      {formatNumber(row['CONSOLIDADO Promedio'])}
                    </td>
                  </tr>
                )),

                // FILA DE TOTAL (si existe)
                ...(category.total ? [
                  <tr
                    key={`cat-${categoryIndex}-total`}
                    className="bg-green-50 font-semibold border-t-2 border-green-200"
                  >
                    <td className="px-6 py-3 text-sm text-green-900 font-bold whitespace-nowrap border-r border-green-200">
                      {category.total.Item}
                    </td>
                    {/* Meses normales (solo Monto y %) */}
                    {data.months.filter(m => !m.toUpperCase().includes('CONSOLIDADO')).map((month: string, monthIdx: number) => (
                      <React.Fragment key={monthIdx}>
                        <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100">
                          {formatNumber(category.total![`${month} Monto`])}
                        </td>
                        <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100">
                          {formatPercentage(category.total![`${month} %`])}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* CONSOLIDADO (Monto, %, Promedio) */}
                    <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100 bg-green-100">
                      {formatNumber(category.total!['CONSOLIDADO Monto'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100 bg-green-100">
                      {formatPercentage(category.total!['CONSOLIDADO %'])}
                    </td>
                    <td className="px-3 py-3 text-sm text-green-900 font-bold text-right whitespace-nowrap border-r border-green-100 bg-green-100">
                      {formatNumber(category.total!['CONSOLIDADO Promedio'])}
                    </td>
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
