import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    const proveedoresMaestro = db.collection('proveedoresMaestro');
    
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
      console.log(`✅ Nuevo proveedor maestro creado: ${rutProveedor} - ${razonSocial}`);
    } else {
      console.log(`ℹ️ Proveedor maestro ya existe: ${rutProveedor}`);
    }

    // 2. Insertar registro en libroCompras
    const libroCompras = db.collection('libroCompras');
    
    // Buscar documento del periodo/sucursal/usuario
    const filter = {
      userId: new ObjectId(userId),
      sucursal,
      periodo,
    };

    // Calcular el próximo número correlativo
    // Buscar ambos documentos (ObjectId y string) para contar todas las transacciones existentes
    const docObjectId = await libroCompras.findOne(filter);
    const docString = await libroCompras.findOne({
      userId,
      sucursal,
      periodo,
    });

    const registrosExistentesObjectId = docObjectId?.data?.length || 0;
    const registrosExistentesString = docString?.transacciones?.length || 0;
    const totalRegistrosExistentes = registrosExistentesObjectId + registrosExistentesString;
    const proximoNro = totalRegistrosExistentes + 1;

    console.log(`[INSERT] Calculando NRO: ObjectId=${registrosExistentesObjectId}, String=${registrosExistentesString}, Próximo=${proximoNro}`);

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

    if (docObjectId) {
      // Agregar registro al array data existente (documento con ObjectId)
      await libroCompras.updateOne(filter, {
        // @ts-expect-error - MongoDB types don't properly handle $push with complex types
        $push: { data: nuevoRegistro },
        $set: { updatedAt: new Date() },
      });
      console.log(`✅ Registro agregado a LC existente (ObjectId): ${sucursal} - ${periodo}`);
    } else {
      // Crear nuevo documento LC
      await libroCompras.insertOne({
        ...filter,
        data: [nuevoRegistro],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Nuevo documento LC creado: ${sucursal} - ${periodo}`);
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
