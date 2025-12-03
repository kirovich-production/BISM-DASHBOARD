'use client';

import { useState, useEffect, useMemo } from 'react';
import { ENCABEZADOS_EERR, UNIDADES_NEGOCIO } from '@/lib/encabezadosEERR';
import { obtenerCuentasPorEncabezado } from '@/lib/cuentasEncabezados';

interface MantenedorLibroDiarioProps {
  userId: string | null;
}

export default function MantenedorLibroDiario({ userId }: MantenedorLibroDiarioProps) {
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Obtener años disponibles (últimos 5 años)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  // Meses
  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Función helper para obtener el estado inicial del formulario
  const getInitialFormData = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    
    return {
      // Periodo y Sucursal
      sucursal: '',
      year: currentYear.toString(),
      month: monthStr,
      
      // Columnas del Libro Diario (29 columnas completas)
      tipoDoc: '',
      tipoCompra: '',
      rutProveedor: '',
      razonSocial: '',
      unidadNegocio: '',
      cuenta: '',
      encabezado: '',
      folio: '',
      fechaDocto: today,
      fechaRecepcion: today,
      fechaAcuse: '',
      montoExento: '',
      montoNeto: '',
      montoIVARecuperable: '',
      montoIVANoRecuperable: '',
      codigoIVANoRec: '',
      montoTotal: '',
      montoNetoActivoFijo: '',
      ivaActivoFijo: '',
      ivaUsoComun: '',
      imptoSinDerechoCredito: '',
      ivaNoRetenido: '',
      tabacosPuros: '',
      tabacosCigarrillos: '',
      tabacosElaborados: '',
      nceNdeSobreFactCompra: '',
      codigoOtroImpuesto: '',
      valorOtroImpuesto: '',
      tasaOtroImpuesto: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // Cargar encabezados al montar
  useEffect(() => {
    const loadEncabezados = async () => {
      try {
        const response = await fetch('/api/encabezados-eerr');
        const result = await response.json();
        if (result.success) {
          setEncabezados(result.encabezados);
        }
      } catch (error) {
        console.error('Error al cargar encabezados:', error);
        // Fallback: usar constante local
        setEncabezados([...ENCABEZADOS_EERR]);
      }
    };
    loadEncabezados();
  }, []);

  // Obtener cuentas disponibles según el encabezado seleccionado
  const cuentasDisponibles = useMemo(() => {
    if (!formData.encabezado) return [];
    return obtenerCuentasPorEncabezado(formData.encabezado);
  }, [formData.encabezado]);

  // Limpiar campo cuenta cuando cambia el encabezado
  useEffect(() => {
    if (formData.encabezado && formData.cuenta) {
      const cuentasValidas = obtenerCuentasPorEncabezado(formData.encabezado);
      if (!cuentasValidas.includes(formData.cuenta)) {
        setFormData(prev => ({ ...prev, cuenta: '' }));
      }
    }
  }, [formData.encabezado, formData.cuenta]);

  // Auto-calcular montoTotal cuando cambian los montos
  // Fórmula: Monto Total = Monto Exento + Monto Neto + IVA Recuperable
  useEffect(() => {
    const exento = parseFloat(formData.montoExento) || 0;
    const neto = parseFloat(formData.montoNeto) || 0;
    const ivaRec = parseFloat(formData.montoIVARecuperable) || 0;
    const total = exento + neto + ivaRec;
    setFormData(prev => ({ ...prev, montoTotal: total > 0 ? total.toString() : '' }));
  }, [formData.montoExento, formData.montoNeto, formData.montoIVARecuperable]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un usuario primero' });
      return;
    }

    // Validaciones
    if (!formData.sucursal || !formData.rutProveedor || !formData.razonSocial || !formData.encabezado) {
      setMensaje({ tipo: 'error', texto: 'Complete todos los campos obligatorios (Sucursal, RUT, Razón Social, Encabezado)' });
      return;
    }

    setIsSubmitting(true);
    setMensaje(null);

    try {
      const periodo = `${formData.year}-${formData.month}`;
      
      const response = await fetch('/api/libro-compras/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sucursal: formData.sucursal,
          periodo,
          // Todas las 29 columnas del Libro Diario
          tipoDoc: formData.tipoDoc,
          tipoCompra: formData.tipoCompra,
          rutProveedor: formData.rutProveedor,
          razonSocial: formData.razonSocial,
          unidadNegocio: formData.unidadNegocio,
          cuenta: formData.cuenta,
          encabezado: formData.encabezado,
          folio: formData.folio,
          fechaDocto: formData.fechaDocto,
          fechaRecepcion: formData.fechaRecepcion,
          fechaAcuse: formData.fechaAcuse,
          montoExento: formData.montoExento,
          montoNeto: formData.montoNeto,
          montoIVARecuperable: formData.montoIVARecuperable,
          montoIVANoRecuperable: formData.montoIVANoRecuperable,
          codigoIVANoRec: formData.codigoIVANoRec,
          montoTotal: formData.montoTotal,
          montoNetoActivoFijo: formData.montoNetoActivoFijo,
          ivaActivoFijo: formData.ivaActivoFijo,
          ivaUsoComun: formData.ivaUsoComun,
          imptoSinDerechoCredito: formData.imptoSinDerechoCredito,
          ivaNoRetenido: formData.ivaNoRetenido,
          tabacosPuros: formData.tabacosPuros,
          tabacosCigarrillos: formData.tabacosCigarrillos,
          tabacosElaborados: formData.tabacosElaborados,
          nceNdeSobreFactCompra: formData.nceNdeSobreFactCompra,
          codigoOtroImpuesto: formData.codigoOtroImpuesto,
          valorOtroImpuesto: formData.valorOtroImpuesto,
          tasaOtroImpuesto: formData.tasaOtroImpuesto,
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMensaje({ 
          tipo: 'success', 
          texto: `✅ Registro insertado correctamente. ${result.proveedorNuevo ? '(Nuevo proveedor creado)' : '(Proveedor existente)'}`
        });
        
        // Limpiar formulario manteniendo sucursal, año y mes
        setFormData(prev => ({
          ...getInitialFormData(),
          sucursal: prev.sucursal,
          year: prev.year,
          month: prev.month,
        }));
      } else {
        setMensaje({ tipo: 'error', texto: result.error || 'Error al insertar registro' });
      }
    } catch (error) {
      console.error('Error al insertar en Libro Diario:', error);
      setMensaje({ tipo: 'error', texto: 'Error de conexión al servidor' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(getInitialFormData());
    setMensaje(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Mantenedor - Inserción en Libro Diario</h3>
        <p className="text-sm text-gray-600">
          Registra manualmente transacciones en el Libro de Compras. Los proveedores se guardan automáticamente.
        </p>
      </div>

      {!userId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ Debes seleccionar un usuario en el selector global para poder insertar registros.
          </p>
        </div>
      )}

      {mensaje && (
        <div className={`rounded-lg p-4 mb-6 ${
          mensaje.tipo === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm font-medium ${
            mensaje.tipo === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {mensaje.texto}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: IDENTIFICACIÓN */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">📋 Identificación</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal <span className="text-red-500">*</span>
              </label>
              <select
                name="sucursal"
                value={formData.sucursal}
                onChange={handleChange}
                required
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              >
                <option value="">Seleccionar...</option>
                <option value="Sevilla">Sevilla</option>
                <option value="Labranza">Labranza</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año <span className="text-red-500">*</span>
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes <span className="text-red-500">*</span>
              </label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                required
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Documento (Código SII)
              </label>
              <input
                type="number"
                name="tipoDoc"
                value={formData.tipoDoc}
                onChange={handleChange}
                disabled={!userId}
                placeholder="33"
                min="30"
                max="112"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-8000 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ej: 33 (Factura), 34 (Factura Exenta), 46 (Factura Compra), 56 (Nota Débito), 61 (Nota Crédito)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Compra
              </label>
              <input
                type="text"
                name="tipoCompra"
                value={formData.tipoCompra}
                onChange={handleChange}
                disabled={!userId}
                placeholder="Ej: Interno, Importación"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folio
              </label>
              <input
                type="text"
                name="folio"
                value={formData.folio}
                onChange={handleChange}
                disabled={!userId}
                placeholder="Número de folio"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: FECHAS */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">📅 Fechas</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Documento
              </label>
              <input
                type="date"
                name="fechaDocto"
                value={formData.fechaDocto}
                onChange={handleChange}
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Recepción
              </label>
              <input
                type="date"
                name="fechaRecepcion"
                value={formData.fechaRecepcion}
                onChange={handleChange}
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Acuse (opcional)
              </label>
              <input
                type="date"
                name="fechaAcuse"
                value={formData.fechaAcuse}
                onChange={handleChange}
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: PROVEEDOR */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">🏢 Proveedor</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUT Proveedor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rutProveedor"
                value={formData.rutProveedor}
                onChange={handleChange}
                required
                disabled={!userId}
                placeholder="12345678-9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="razonSocial"
                value={formData.razonSocial}
                onChange={handleChange}
                required
                disabled={!userId}
                placeholder="Nombre del proveedor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidad de Negocio
              </label>
              <select
                name="unidadNegocio"
                value={formData.unidadNegocio}
                onChange={handleChange}
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              >
                <option value="">Seleccionar...</option>
                {UNIDADES_NEGOCIO.map((unidad: string) => (
                  <option key={unidad} value={unidad}>{unidad}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: CLASIFICACIÓN CONTABLE */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">🏦 Clasificación Contable</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Encabezado EERR <span className="text-red-500">*</span>
              </label>
              <select
                name="encabezado"
                value={formData.encabezado}
                onChange={handleChange}
                required
                disabled={!userId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 font-medium text-gray-900"
              >
                <option value="">Seleccionar clasificación...</option>
                {encabezados.map(enc => (
                  <option key={enc} value={enc}>{enc}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Clasificación del gasto/ingreso en el EERR</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuenta {formData.encabezado && <span className="text-red-500">*</span>}
              </label>
              <select
                name="cuenta"
                value={formData.cuenta}
                onChange={handleChange}
                disabled={!userId || !formData.encabezado || cuentasDisponibles.length === 0}
                required={!!formData.encabezado}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              >
                <option value="">
                  {!formData.encabezado 
                    ? 'Primero seleccione un encabezado...' 
                    : cuentasDisponibles.length === 0 
                      ? 'No hay cuentas disponibles' 
                      : 'Seleccionar cuenta...'}
                </option>
                {cuentasDisponibles.map(cuenta => (
                  <option key={cuenta} value={cuenta}>{cuenta}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.encabezado 
                  ? `${cuentasDisponibles.length} cuenta(s) disponible(s)` 
                  : 'Seleccione primero un encabezado'}
              </p>
            </div>
          </div>
        </div>

        {/* SECCIÓN 5: MONTOS BASE */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">💰 Montos Base</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Exento
              </label>
              <input
                type="number"
                name="montoExento"
                value={formData.montoExento}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Neto
              </label>
              <input
                type="number"
                name="montoNeto"
                value={formData.montoNeto}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Total (calculado)
              </label>
              <input
                type="number"
                name="montoTotal"
                value={formData.montoTotal}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 bg-gray-50 font-semibold text-gray-900"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 6: IVA */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 IVA</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IVA Recuperable
              </label>
              <input
                type="number"
                name="montoIVARecuperable"
                value={formData.montoIVARecuperable}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IVA No Recuperable
              </label>
              <input
                type="number"
                name="montoIVANoRecuperable"
                value={formData.montoIVANoRecuperable}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código IVA No Rec
              </label>
              <input
                type="text"
                name="codigoIVANoRec"
                value={formData.codigoIVANoRec}
                onChange={handleChange}
                disabled={!userId}
                placeholder="Código"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IVA Activo Fijo
              </label>
              <input
                type="number"
                name="ivaActivoFijo"
                value={formData.ivaActivoFijo}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IVA Uso Común
              </label>
              <input
                type="number"
                name="ivaUsoComun"
                value={formData.ivaUsoComun}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IVA No Retenido
              </label>
              <input
                type="number"
                name="ivaNoRetenido"
                value={formData.ivaNoRetenido}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 7: ACTIVO FIJO Y OTROS */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">🏗️ Activo Fijo y Otros</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Neto Activo Fijo
              </label>
              <input
                type="number"
                name="montoNetoActivoFijo"
                value={formData.montoNetoActivoFijo}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impuesto Sin Derecho a Crédito
              </label>
              <input
                type="number"
                name="imptoSinDerechoCredito"
                value={formData.imptoSinDerechoCredito}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NCE/NDE sobre Fact. Compra
              </label>
              <input
                type="number"
                name="nceNdeSobreFactCompra"
                value={formData.nceNdeSobreFactCompra}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 8: IMPUESTOS ESPECIALES */}
        <div className="bg-gray-30 border border-gray-300 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">🚬 Impuestos Especiales</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tabacos Puros
              </label>
              <input
                type="number"
                name="tabacosPuros"
                value={formData.tabacosPuros}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tabacos Cigarrillos
              </label>
              <input
                type="number"
                name="tabacosCigarrillos"
                value={formData.tabacosCigarrillos}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tabacos Elaborados
              </label>
              <input
                type="number"
                name="tabacosElaborados"
                value={formData.tabacosElaborados}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Otro Impuesto
              </label>
              <input
                type="text"
                name="codigoOtroImpuesto"
                value={formData.codigoOtroImpuesto}
                onChange={handleChange}
                disabled={!userId}
                placeholder="Código"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Otro Impuesto
              </label>
              <input
                type="number"
                name="valorOtroImpuesto"
                value={formData.valorOtroImpuesto}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasa Otro Impuesto
              </label>
              <input
                type="number"
                name="tasaOtroImpuesto"
                value={formData.tasaOtroImpuesto}
                onChange={handleChange}
                disabled={!userId}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={!userId || isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isSubmitting ? 'Insertando...' : '💾 Insertar en Libro Diario'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={!userId || isSubmitting}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
          >
            🔄 Limpiar Formulario
          </button>
        </div>
      </form>
    </div>
  );
}
