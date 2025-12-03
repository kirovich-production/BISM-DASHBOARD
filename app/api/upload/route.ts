import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';
import * as XLSX from 'xlsx';
import { parseConsolidado, parseLibroComprasSheet } from '@/lib/excelParser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const period = formData.get('period') as string;
    const periodLabel = formData.get('periodLabel') as string;
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    if (!period || !periodLabel) {
      return NextResponse.json(
        { error: 'No se proporcionó el período' },
        { status: 400 }
      );
    }

    if (!userId || !userName) {
      return NextResponse.json(
        { error: 'No se proporcionó el usuario. Por favor selecciona un usuario antes de cargar el archivo.' },
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
        { error: 'El archivo debe ser un Excel (.xls o .xlsx)' },
        { status: 400 }
      );
    }

    // Leer el archivo Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
   
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    
    // Parsear las 3 hojas con las nuevas funciones
    
    const consolidadoData = parseConsolidado(workbook);
    
    // Parsear Libro de Compras y generar EERR automáticamente
    const libroComprasTransactions = parseLibroComprasSheet(workbook);
    
    let sevillaData = null;
    let labranzaData = null;
    
    if (libroComprasTransactions && libroComprasTransactions.length > 0) {
      // Generar EERR desde Libro de Compras
      const { generateEERRFromLibroCompras } = await import('@/lib/eerrCalculator');
      sevillaData = generateEERRFromLibroCompras(libroComprasTransactions, 'Sevilla');
      labranzaData = generateEERRFromLibroCompras(libroComprasTransactions, 'Labranza');
      console.log(`[UPLOAD] ✅ EERR generado automáticamente desde Libro de Compras`);
    } else {
      console.warn('[UPLOAD] ⚠️ No se encontraron transacciones en Libro de Compras, EERR no generado');
    }

    // Validar que al menos tengamos la hoja consolidado
    if (!consolidadoData) {
      console.error('[UPLOAD] ❌ ERROR: No se pudo parsear la hoja Consolidado');
      return NextResponse.json(
        { 
          error: 'No se encontró o no se pudo procesar la hoja "Consolidado" en el archivo Excel. Revisa la consola del servidor para más detalles.',
          sheetsFound: workbook.SheetNames
        },
        { status: 400 }
      );
    }

    // Conectar a MongoDB
    const { db } = await connectToDatabase();
    
    // Usar colección específica del usuario
    const collectionName = getUserCollectionName(userName);
    const collection = db.collection(collectionName);

    // Obtener la versión más alta para este período (ya no necesitamos filtrar por userId)
    const existingPeriods = await collection
      .find({ period })
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    
    const version = existingPeriods.length > 0 ? existingPeriods[0].version + 1 : 1;

    // Crear documento con metadata (incluyendo userId)
    const document = {
      userId,
      fileName: file.name,
      period,
      periodLabel,
      version,
      uploadedAt: new Date(),
      // Datos parseados de las 3 hojas
      consolidado: consolidadoData, // ExcelSection[] (formato antiguo)
      sevilla: sevillaData,         // EERRData (formato nuevo)
      labranza: labranzaData,       // EERRData (formato nuevo)
      // Mantener sections por compatibilidad (deprecated)
      sections: consolidadoData || []
    };

    // Insertar documento completo en MongoDB
    const result = await collection.insertOne(document);
  


    return NextResponse.json({
      success: true,
      message: `Datos cargados exitosamente para ${userName}`,
      recordsInserted: 1,
      userId,
      userName,
      fileName: file.name,
      period,
      periodLabel,
      version,
      sheetsProcessed: [
        consolidadoData ? 'Consolidado' : null,
        sevillaData?.sheetName,
        labranzaData?.sheetName
      ].filter(Boolean),
      // Mantener sectionsFound por compatibilidad con page.tsx
      sectionsFound: consolidadoData?.map(s => s.name) || []
    });

  } catch (error) {
    console.error('='.repeat(60));
    console.error('[UPLOAD] ❌ ERROR FATAL al procesar el archivo:');
    console.error(error);
    console.error('='.repeat(60));
    return NextResponse.json(
      { 
        error: 'Error al procesar el archivo Excel. Revisa la consola del servidor para más detalles.',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
