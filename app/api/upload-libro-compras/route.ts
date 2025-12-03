import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import * as XLSX from 'xlsx';
import { parseLibroComprasSheet, parseClasificacionSheet } from '@/lib/excelParser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const sucursal = formData.get('sucursal') as string;
    const periodo = formData.get('periodo') as string;
    const periodLabel = formData.get('periodLabel') as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    if (!userId || !sucursal || !periodo) {
      return NextResponse.json(
        { success: false, message: 'Faltan parámetros requeridos (userId, sucursal, periodo)' },
        { status: 400 }
      );
    }

    // Validar que sea un archivo Excel
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'El archivo debe ser un Excel (.xls o .xlsx)' },
        { status: 400 }
      );
    }

    // Leer el archivo Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    console.log(`[UPLOAD-LC] 📄 Procesando: ${file.name} | Usuario: ${userId} | Sucursal: ${sucursal} | Período: ${periodo}`);
    
    // Parsear Libro de Compras
    const libroComprasTransactions = parseLibroComprasSheet(workbook);
    
    if (!libroComprasTransactions || libroComprasTransactions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No se encontró la hoja "LC" o no contiene datos válidos' },
        { status: 400 }
      );
    }

    // Parsear proveedores/clasificación
    const proveedoresData = parseClasificacionSheet(workbook);
    console.log(`[UPLOAD-LC] Proveedores parseados: ${proveedoresData?.length || 0}`);

    // Conectar a MongoDB
    const { db } = await connectToDatabase();
    
    // Guardar Libro de Compras
    const libroComprasCollection = db.collection('libroCompras');
    
    // Eliminar documento existente del mismo userId, período y sucursal
    await libroComprasCollection.deleteMany({
      userId,
      periodo,
      sucursal
    });
    
    // Crear nuevo documento
    const libroComprasDoc = {
      userId,
      periodo,
      periodLabel,
      sucursal,
      fileName: file.name,
      transacciones: libroComprasTransactions,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await libroComprasCollection.insertOne(libroComprasDoc);
    console.log(`[UPLOAD-LC] ✅ Libro de Compras guardado: ${libroComprasTransactions.length} transacciones`);

    // Guardar proveedores si existen
    let proveedoresCount = 0;
    if (proveedoresData && proveedoresData.length > 0) {
      const proveedoresCollection = db.collection('proveedores');
      
      // Eliminar proveedores existentes del mismo userId, período y sucursal
      await proveedoresCollection.deleteMany({
        userId,
        periodo,
        sucursal
      });
      
      // Crear documentos de proveedores con contexto completo
      const proveedoresDocs = proveedoresData.map(p => ({
        userId,
        sucursal,
        periodo,
        rut: p.rut,
        nombre: p.nombre,
        centroCosto: p.centroCosto,
        tipoCuenta: p.tipoCuenta,
        observaciones: p.observaciones || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await proveedoresCollection.insertMany(proveedoresDocs);
      proveedoresCount = proveedoresDocs.length;
      console.log(`[UPLOAD-LC] ✅ Proveedores guardados: ${proveedoresCount} documentos`);
    }

    return NextResponse.json({
      success: true,
      message: `Libro de Compras de ${sucursal} procesado correctamente`,
      transaccionesCount: libroComprasTransactions.length,
      proveedoresCount
    });

  } catch (error) {
    console.error('='.repeat(60));
    console.error('[UPLOAD-LC] ❌ ERROR al procesar Libro de Compras:');
    console.error(error);
    console.error('='.repeat(60));
    return NextResponse.json(
      { 
        success: false,
        message: 'Error al procesar el archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
