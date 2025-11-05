'use client';

import React from 'react';
import { EERRData, EERRCategory, EERRRow } from '@/types';

interface ConsolidadoTableProps {
  data: EERRData | null;
  periodLabel: string;
  version?: number;
  uploadedAt?: string | Date;
}

export default function ConsolidadoTable({ data, periodLabel, version, uploadedAt }: ConsolidadoTableProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay datos disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron datos consolidados para el período seleccionado.
          </p>
        </div>
      </div>
    );
  }

  const formatNumber = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header fijo */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-900">Consolidado</h1>
            <p className="text-sm text-gray-600 mt-1">
              Período: {periodLabel}
              {version && ` • Versión ${version}`}
              {uploadedAt && ` • ${new Date(uploadedAt).toLocaleDateString('es-CL')}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla consolidada */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-300">
            {/* Header de la tabla */}
            <thead className="bg-purple-600 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-purple-500">
                  Concepto
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider border-r border-purple-500">
                  Monto
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider border-r border-purple-500">
                  %
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Promedio
                </th>
              </tr>
            </thead>

            {/* Body de la tabla */}
            <tbody className="bg-white divide-y divide-gray-200">
              {data.categories.flatMap((category: EERRCategory, categoryIndex: number) => [
                // FILA DE CATEGORÍA (título)
                <tr key={`cat-${categoryIndex}`} className="bg-gradient-to-r from-purple-100 to-purple-50 border-t-2 border-purple-300">
                  <td
                    colSpan={4}
                    className="px-6 py-3 text-sm font-bold text-purple-900 uppercase tracking-wide"
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
                    <td className="px-6 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                      {formatNumber(row['CONSOLIDADO Monto'])}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right whitespace-nowrap border-r border-gray-100">
                      {formatPercentage(row['CONSOLIDADO %'])}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {formatNumber(row['CONSOLIDADO Promedio'])}
                    </td>
                  </tr>
                )),

                // FILA DE TOTAL (si existe)
                ...(category.total ? [
                  <tr
                    key={`cat-${categoryIndex}-total`}
                    className="bg-purple-50 font-semibold border-t-2 border-purple-200"
                  >
                    <td className="px-6 py-3 text-sm text-purple-900 font-bold whitespace-nowrap border-r border-purple-200">
                      {category.total.Item}
                    </td>
                    <td className="px-6 py-3 text-sm text-purple-900 font-bold text-right whitespace-nowrap border-r border-purple-100">
                      {formatNumber(category.total['CONSOLIDADO Monto'])}
                    </td>
                    <td className="px-6 py-3 text-sm text-purple-900 font-bold text-right whitespace-nowrap border-r border-purple-100">
                      {formatPercentage(category.total['CONSOLIDADO %'])}
                    </td>
                    <td className="px-6 py-3 text-sm text-purple-900 font-bold text-right whitespace-nowrap">
                      {formatNumber(category.total['CONSOLIDADO Promedio'])}
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
