'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LibroComprasData } from '@/types';

interface LibroComprasTableProps {
  userId: string;
  periodo: string;
  onDataLoad?: (data: LibroComprasData | null) => void;
}

export default function LibroComprasTable({ userId, periodo, onDataLoad }: LibroComprasTableProps) {
  const [data, setData] = useState<LibroComprasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnidad, setFilterUnidad] = useState('');
  const [filterCuenta, setFilterCuenta] = useState('');

  const loadData = async () => {
    if (!userId || !periodo) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/libro-compras?userId=${userId}&periodo=${periodo}`);
      const result = await response.json();
      
      
      if (result.success && result.data) {
        setData(result.data);
        onDataLoad?.(result.data);
      } else {
        setData(null);
        onDataLoad?.(null);
      }
    } catch (error) {
      console.error('[LibroComprasTable] ❌ Error al cargar datos:', error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos cuando cambien userId o periodo
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, periodo]);

  // Obtener valores únicos para filtros
  const unidadesNegocio = useMemo(() => {
    if (!data?.transacciones) return [];
    return Array.from(new Set(data.transacciones.map(t => t.unidadNegocio).filter(Boolean)));
  }, [data]);

  const cuentas = useMemo(() => {
    if (!data?.transacciones) return [];
    return Array.from(new Set(data.transacciones.map(t => t.cuenta).filter(Boolean)));
  }, [data]);

  // Filtrar transacciones
  const filteredTransactions = useMemo(() => {
    if (!data?.transacciones) return [];
    
    return data.transacciones.filter(t => {
      const matchSearch = !searchTerm || 
        t.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.rutProveedor.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchUnidad = !filterUnidad || t.unidadNegocio === filterUnidad;
      const matchCuenta = !filterCuenta || t.cuenta === filterCuenta;
      
      return matchSearch && matchUnidad && matchCuenta;
    });
  }, [data, searchTerm, filterUnidad, filterCuenta]);

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('es-CL').format(value);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Cargando datos...</div>
      </div>
    );
  }

  if (!data || !data.transacciones || data.transacciones.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">No hay datos disponibles para este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar (Proveedor/RUT)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unidad de Negocio
            </label>
            <select
              value={filterUnidad}
              onChange={(e) => setFilterUnidad(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {unidadesNegocio.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cuenta
            </label>
            <select
              value={filterCuenta}
              onChange={(e) => setFilterCuenta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {cuentas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Mostrando {filteredTransactions.length} de {data.transacciones.length} transacciones</span>
          {searchTerm || filterUnidad || filterCuenta ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterUnidad('');
                setFilterCuenta('');
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabla - TODAS LAS 29 COLUMNAS */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-600 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Nro</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Tipo Doc</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Tipo Compra</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">RUT Proveedor</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Razón Social</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Unidad Negocio</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Cuenta</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Folio</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Fecha Docto</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Fecha Recepción</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Fecha Acuse</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Monto Exento</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Monto Neto</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">IVA Recuperable</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">IVA No Recuperable</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Código IVA No Rec.</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Monto Total</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Neto Activo Fijo</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">IVA Activo Fijo</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">IVA Uso Común</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Impto Sin Derecho</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">IVA No Retenido</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Tabacos Puros</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Tabacos Cigarrillos</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Tabacos Elaborados</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">NCE o NDE</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase whitespace-nowrap">Código Otro Impto</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Valor Otro Impto</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase whitespace-nowrap">Tasa Otro Impto</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((trans, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.nro}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.tipoDoc}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.tipoCompra}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.rutProveedor}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 max-w-xs">{trans.razonSocial}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.unidadNegocio}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.cuenta}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.folio}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{String(trans.fechaDocto)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{String(trans.fechaRecepcion)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.fechaAcuse ? String(trans.fechaAcuse) : '-'}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.montoExento)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.montoNeto)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.montoIVARecuperable)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.montoIVANoRecuperable)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.codigoIVANoRec || '-'}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right font-semibold whitespace-nowrap">{formatNumber(trans.montoTotal)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.montoNetoActivoFijo)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.ivaActivoFijo)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.ivaUsoComun)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.imptoSinDerechoCredito)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.ivaNoRetenido)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.tabacosPuros)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.tabacosCigarrillos)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.tabacosElaborados)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.nceNdeSobreFactCompra)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{trans.codigoOtroImpuesto || '-'}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.valorOtroImpuesto)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatNumber(trans.tasaOtroImpuesto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
