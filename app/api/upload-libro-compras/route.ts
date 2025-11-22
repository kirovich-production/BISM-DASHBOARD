import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { connectToDatabase } from '@/lib/mongodb';
import { parseLibroComprasSheet, parseClasificacionSheet } from '@/lib/excelParser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const periodo = formData.get('periodo') as string; // Formato: YYYY-MM
    const periodLabel = formData.get('periodLabel') as string; // Formato: "Mes Año"

    if (!file || !userId || !periodo || !periodLabel) {
      return NextResponse.json({
        success: false,
        message: 'Faltan datos requeridos: file, userId, periodo, periodLabel',
      }, { status: 400 });
    }

    // Leer el archivo Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    console.log(`[upload-libro-compras] 📄 Hojas disponibles: ${workbook.SheetNames.join(', ')}`);

    // ========================================
    // PASO 1: Parsear hoja "LC" (Libro de Compras)
    // ========================================
    const transacciones = parseLibroComprasSheet(workbook);
    
    if (!transacciones || transacciones.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron transacciones en la hoja "LC"',
      }, { status: 400 });
    }

    // ========================================
    // PASO 2: Parsear hoja "CLASIFICACIÓN" (Proveedores)
    // ========================================
    console.log('[upload-libro-compras] 🔍 Iniciando parseo de hoja CLASIFICACIÓN...');
    const proveedoresRaw = parseClasificacionSheet(workbook);
    
    if (!proveedoresRaw || proveedoresRaw.length === 0) {
      console.warn('[upload-libro-compras] ⚠️ No se encontraron proveedores en la hoja "CLASIFICACIÓN"');
      console.warn('[upload-libro-compras] 📋 Hojas disponibles en el Excel:', workbook.SheetNames);
    } else {
      console.log(`[upload-libro-compras] ✅ Se encontraron ${proveedoresRaw.length} registros de proveedores`);
    }

    // ========================================
    // PASO 3: Preparar proveedores (sin agrupar - cada fila es independiente)
    // ========================================
    const proveedores = proveedoresRaw || [];

    // ========================================
    // PASO 4: Guardar en MongoDB
    // ========================================
    const { db } = await connectToDatabase();

    // 4.1: Guardar Proveedores (cada fila como documento independiente)
    let proveedoresCount = 0;
    if (proveedores.length > 0) {
      const proveedoresCollection = db.collection('proveedores');
      
      // Eliminar proveedores existentes para reemplazarlos con los nuevos
      await proveedoresCollection.deleteMany({});
      
      // Insertar todos los proveedores como documentos separados
      const proveedoresDocuments = proveedores.map(p => ({
        rut: p.rut,
        nombre: p.nombre,
        centroCosto: p.centroCosto || '',
        tipoCuenta: p.tipoCuenta || '',
        observaciones: p.observaciones || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      if (proveedoresDocuments.length > 0) {
        await proveedoresCollection.insertMany(proveedoresDocuments);
        proveedoresCount = proveedoresDocuments.length;
      }
    }

    // 4.2: Guardar Libro de Compras
    const libroComprasCollection = db.collection('libroCompras');
    
    // Verificar si ya existe un documento para este período y usuario
    const existingDoc = await libroComprasCollection.findOne({
      userId,
      periodo
    });

    const libroComprasData = {
      userId,
      periodo,
      periodLabel,
      sucursal: 'pending', // Por ahora
      fileName: file.name,
      transacciones,
      updatedAt: new Date()
    };

    if (existingDoc) {
      // Actualizar documento existente
      await libroComprasCollection.updateOne(
        { userId, periodo },
        { $set: libroComprasData }
      );
    } else {
      // Crear nuevo documento
      await libroComprasCollection.insertOne({
        ...libroComprasData,
        createdAt: new Date()
      });
    }

    // ========================================
    // RESPUESTA
    // ========================================
    return NextResponse.json({
      success: true,
      message: 'Libro de compras cargado exitosamente',
      periodo,
      periodLabel,
      transaccionesCount: transacciones.length,
      proveedoresCount,
      fileName: file.name
    });

  } catch (error) {
    console.error('[upload-libro-compras] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al procesar el archivo',
    }, { status: 500 });
  }
}
