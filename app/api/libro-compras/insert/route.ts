import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MONTH_NAMES, COLLECTIONS } from '@/lib/constants';

/**
 * Genera periodLabel desde periodo (ej: "2025-09" → "Septiembre 2025")
 */
function getPeriodLabel(periodo: string): string {
  const [year, month] = periodo.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES[monthIndex] || 'Desconocido';
  return `${monthName} ${year}`;
}

// POST /api/libro-compras/insert - Insertar registro en Libro de Compras
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      userId,
      sucursal,
      periodo, // formato: "2024-11"
      // Datos del registro (29 columnas completas)
      tipoDoc,
      tipoCompra,
      rutProveedor,
      razonSocial,
      unidadNegocio,
      cuenta,
      encabezado,
      folio,
      fechaDocto,
      fechaRecepcion,
      fechaAcuse,
      montoExento,
      montoNeto,
      montoIVARecuperable,
      montoIVANoRecuperable,
      codigoIVANoRec,
      montoTotal,
      montoNetoActivoFijo,
      ivaActivoFijo,
      ivaUsoComun,
      imptoSinDerechoCredito,
      ivaNoRetenido,
      tabacosPuros,
      tabacosCigarrillos,
      tabacosElaborados,
      nceNdeSobreFactCompra,
      codigoOtroImpuesto,
      valorOtroImpuesto,
      tasaOtroImpuesto,
    } = body;

    // Validaciones
    if (!userId || !sucursal || !periodo) {
      return NextResponse.json(
        { success: false, error: 'userId, sucursal y periodo son requeridos' },
        { status: 400 }
      );
    }

    if (!rutProveedor || !razonSocial || !encabezado) {
      return NextResponse.json(
        { success: false, error: 'RUT Proveedor, Razón Social y Encabezado son requeridos' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // 1. Validar/Crear proveedor en proveedoresMaestro
    const proveedoresMaestro = db.collection(COLLECTIONS.PROVEEDORES_MAESTRO);
    
    const proveedorExistente = await proveedoresMaestro.findOne({ rut: rutProveedor });
    
    if (!proveedorExistente) {
      // Crear nuevo proveedor maestro
      await proveedoresMaestro.insertOne({
        rut: rutProveedor,
        razonSocial,
        cuenta: cuenta || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 2. Insertar registro en libroCompras
    const libroCompras = db.collection(COLLECTIONS.LIBRO_COMPRAS);
    
    // Buscar documento existente del periodo/sucursal/usuario (userId como string, consistente con upload)
    const filter = {
      userId,
      sucursal,
      periodo,
    };

    const docExistente = await libroCompras.findOne(filter);

    // Calcular el próximo número correlativo
    const transaccionesExistentes = docExistente?.transacciones?.length || 0;
    const proximoNro = transaccionesExistentes + 1;

    const nuevoRegistro = {
      nro: proximoNro,
      tipoDoc: parseInt(tipoDoc) || 33, // Código SII, default 33 (Factura Electrónica)
      tipoCompra: tipoCompra || '',
      rutProveedor,
      razonSocial,
      unidadNegocio: unidadNegocio || '',
      cuenta: cuenta || '',
      encabezado,
      folio: folio || '',
      fechaDocto: fechaDocto || new Date().toISOString().split('T')[0],
      fechaRecepcion: fechaRecepcion || new Date().toISOString().split('T')[0],
      fechaAcuse: fechaAcuse || '',
      montoExento: parseFloat(montoExento) || 0,
      montoNeto: parseFloat(montoNeto) || 0,
      montoIVARecuperable: parseFloat(montoIVARecuperable) || 0,
      montoIVANoRecuperable: parseFloat(montoIVANoRecuperable) || 0,
      codigoIVANoRec: codigoIVANoRec || '',
      montoTotal: parseFloat(montoTotal) || 0,
      montoNetoActivoFijo: parseFloat(montoNetoActivoFijo) || 0,
      ivaActivoFijo: parseFloat(ivaActivoFijo) || 0,
      ivaUsoComun: parseFloat(ivaUsoComun) || 0,
      imptoSinDerechoCredito: parseFloat(imptoSinDerechoCredito) || 0,
      ivaNoRetenido: parseFloat(ivaNoRetenido) || 0,
      tabacosPuros: parseFloat(tabacosPuros) || 0,
      tabacosCigarrillos: parseFloat(tabacosCigarrillos) || 0,
      tabacosElaborados: parseFloat(tabacosElaborados) || 0,
      nceNdeSobreFactCompra: parseFloat(nceNdeSobreFactCompra) || 0,
      codigoOtroImpuesto: codigoOtroImpuesto || '',
      valorOtroImpuesto: parseFloat(valorOtroImpuesto) || 0,
      tasaOtroImpuesto: parseFloat(tasaOtroImpuesto) || 0,
      esManual: true, // Flag para identificar registros insertados manualmente
      creadoEn: new Date(),
    };

    if (docExistente) {
      // Agregar registro al array transacciones existente
      await libroCompras.updateOne(filter, {
        // @ts-expect-error - MongoDB types don't properly handle $push with complex types
        $push: { transacciones: nuevoRegistro },
        $set: { updatedAt: new Date() },
      });
    } else {
      // Crear nuevo documento LC con estructura consistente con upload-libro-compras
      await libroCompras.insertOne({
        userId,
        periodo,
        periodLabel: getPeriodLabel(periodo),
        sucursal,
        fileName: 'Ingreso Manual',
        transacciones: [nuevoRegistro],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Registro insertado correctamente en el Libro de Compras',
      proveedorNuevo: !proveedorExistente,
    });

  } catch (error) {
    console.error('❌ Error insertando en Libro de Compras:', error);
    return NextResponse.json(
      { success: false, error: 'Error al insertar registro' },
      { status: 500 }
    );
  }
}
