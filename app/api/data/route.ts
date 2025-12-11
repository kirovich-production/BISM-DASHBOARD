import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';
import { aggregateMultiplePeriodsToEERR } from '@/lib/libroComprasAggregator';
import { convertEERRDataToExcelRows, sumarTablas } from '@/lib/consolidadoHelper';
import { LibroComprasData } from '@/types';
import { ObjectId, Db, Collection } from 'mongodb';
import {
  buscarDocumentosPorPeriodo,
  buscarTodosDocumentosPorSucursal,
  prepararDocumentosConValores,
  crearSucursalSlug
} from '@/lib/dataHelpers';

// Obtener la carga más reciente de datos o por período/versión específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const period = searchParams.get('period');
    const version = searchParams.get('version');
    const userName = searchParams.get('userName'); // Para Excel tradicional
    const userId = searchParams.get('userId'); // Para Libro de Compras
    const sucursal = searchParams.get('sucursal'); // Filtrar por sucursal

    // IMPORTANTE: necesitamos userName (Excel) o userId (LC) según el caso
    if (!userName && !userId) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del usuario (userName) o userId' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Si es userId (Libro de Compras), generar datos con Consolidado
    if (userId) {
      return await handleLibroComprasData(db, userId, sucursal, period);
    }
    
    // Usar colección específica del usuario (Excel EERR tradicional)
    return await handleExcelData(db, userName!, period, version, section);

  } catch (error) {
    console.error('Error al obtener datos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos' },
      { status: 500 }
    );
  }
}

/**
 * Maneja datos de Libro de Compras
 */
async function handleLibroComprasData(
  db: Db,
  userId: string,
  sucursal: string | null,
  period: string | null
) {
  const libroComprasCollection = db.collection('libroCompras');
  const valoresManualesCollection = db.collection('valoresManuales');
  
  // Si se especifica sucursal, retornar solo esa
  if (sucursal) {
    return await handleSingleSucursal(
      libroComprasCollection,
      valoresManualesCollection,
      userId,
      sucursal,
      period
    );
  }
  
  // Sin sucursal: cargar todas las sucursales del usuario
  return await handleAllSucursales(
    db,
    libroComprasCollection,
    valoresManualesCollection,
    userId,
    period
  );
}

/**
 * Maneja datos de una sucursal específica
 */
async function handleSingleSucursal(
  libroComprasCollection: Collection,
  valoresManualesCollection: Collection,
  userId: string,
  sucursal: string,
  period: string | null
) {
  let sucursalDocs: LibroComprasData[] = [];
  
  if (period) {
    const doc = await buscarDocumentosPorPeriodo(libroComprasCollection, userId, sucursal, period);
    if (doc) sucursalDocs.push(doc);
  } else {
    sucursalDocs = await buscarTodosDocumentosPorSucursal(libroComprasCollection, userId, sucursal);
  }
  
  if (sucursalDocs.length === 0) {
    return NextResponse.json({
      success: true,
      data: null,
      message: `No hay datos de Libro de Compras para ${sucursal}${period ? ` en ${period}` : ''}`
    });
  }
  
  const docsConValores = await prepararDocumentosConValores(
    sucursalDocs,
    userId,
    sucursal,
    valoresManualesCollection
  );
  
  const eerrData = aggregateMultiplePeriodsToEERR(docsConValores);
  
  const firstDoc = sucursalDocs[0];
  const lastDoc = sucursalDocs[sucursalDocs.length - 1];
  const sucursalSlug = crearSucursalSlug(sucursal);
  
  const responseData: Record<string, unknown> = {
    period: period || firstDoc.periodo,
    periodLabel: firstDoc.periodLabel,
    version: 1,
    uploadedAt: lastDoc.updatedAt || lastDoc.createdAt,
    [sucursalSlug]: eerrData
  };
  
  return NextResponse.json({
    success: true,
    data: responseData,
    uploadedAt: responseData.uploadedAt
  });
}

/**
 * Maneja datos de todas las sucursales del usuario
 */
async function handleAllSucursales(
  db: Db,
  libroComprasCollection: Collection,
  valoresManualesCollection: Collection,
  userId: string,
  period: string | null
) {
  // Obtener las sucursales del usuario
  const usersCollection = db.collection('users');
  const userDoc = await usersCollection.findOne({ _id: new ObjectId(userId) });
  
  if (!userDoc?.sucursales?.length) {
    return NextResponse.json({
      success: true,
      data: null,
      message: 'Usuario no tiene sucursales asignadas'
    });
  }
  
  const userSucursales: string[] = userDoc.sucursales;
  
  // Obtener documentos de todas las sucursales
  const sucursalesDocsMap: { [sucursal: string]: LibroComprasData[] } = {};
  
  for (const sucursalName of userSucursales) {
    let docs: LibroComprasData[] = [];
    
    if (period) {
      const doc = await buscarDocumentosPorPeriodo(libroComprasCollection, userId, sucursalName, period);
      if (doc) docs = [doc];
    } else {
      docs = await buscarTodosDocumentosPorSucursal(libroComprasCollection, userId, sucursalName);
    }
    
    if (docs.length > 0) {
      sucursalesDocsMap[sucursalName] = docs;
    }
  }
  
  // Verificar si hay datos
  const totalDocs = Object.values(sucursalesDocsMap).flat();
  if (totalDocs.length === 0) {
    return NextResponse.json({
      success: true,
      data: null,
      message: `No hay datos de Libro de Compras${period ? ` para ${period}` : ''}`
    });
  }
  
  const firstDoc = totalDocs[0];
  const lastDoc = totalDocs[totalDocs.length - 1];
  const latestUploadedAt = lastDoc?.updatedAt || lastDoc?.createdAt || firstDoc?.updatedAt || firstDoc?.createdAt;
  
  const responseData: Record<string, unknown> = {
    period: period || firstDoc?.periodo,
    periodLabel: firstDoc?.periodLabel,
    version: 1,
    uploadedAt: latestUploadedAt,
    consolidado: []
  };
  
  // Generar datos EERR para cada sucursal
  const sucursalesPlanas: { [sucursal: string]: ReturnType<typeof convertEERRDataToExcelRows> } = {};
  
  for (const [sucursalName, docs] of Object.entries(sucursalesDocsMap)) {
    const docsConValores = await prepararDocumentosConValores(
      docs,
      userId,
      sucursalName,
      valoresManualesCollection
    );
    
    const eerrData = aggregateMultiplePeriodsToEERR(docsConValores);
    const sucursalSlug = crearSucursalSlug(sucursalName);
    
    responseData[sucursalSlug] = eerrData;
    
    // Convertir a formato plano para TableView
    const plana = convertEERRDataToExcelRows(eerrData);
    sucursalesPlanas[sucursalName] = plana;
    
    (responseData.consolidado as Array<{ name: string; data: unknown }>).push({
      name: sucursalName,
      data: plana
    });
  }
  
  // Generar tabla Consolidados (suma de todas las sucursales)
  if (Object.keys(sucursalesPlanas).length > 1) {
    const tablasPlanas = Object.values(sucursalesPlanas);
    let consolidadosPlana = tablasPlanas[0];
    
    for (let i = 1; i < tablasPlanas.length; i++) {
      consolidadosPlana = sumarTablas(consolidadosPlana, tablasPlanas[i]);
    }
    
    (responseData.consolidado as Array<{ name: string; data: unknown }>).push({
      name: 'Consolidados',
      data: consolidadosPlana
    });
  }
  
  return NextResponse.json({
    success: true,
    data: responseData,
    uploadedAt: responseData.uploadedAt
  });
}

/**
 * Maneja datos de Excel EERR tradicional
 */
async function handleExcelData(
  db: Db,
  userName: string,
  period: string | null,
  version: string | null,
  section: string | null
) {
  const collectionName = getUserCollectionName(userName);
  const collection = db.collection(collectionName);
  
  let data;

  if (period) {
    const filter: { period: string; version?: number } = { period };
    
    if (version) {
      filter.version = parseInt(version);
      data = await collection.findOne(filter);
    } else {
      const results = await collection
        .find(filter)
        .sort({ version: -1 })
        .limit(1)
        .toArray();
      
      data = results.length > 0 ? results[0] : null;
    }
    
    if (!data) {
      return NextResponse.json({
        success: true,
        data: null,
        message: `No hay datos disponibles para el período ${period}${version ? ` versión ${version}` : ''}`
      });
    }
  } else {
    const latestUpload = await collection
      .find({})
      .sort({ period: -1, version: -1 })
      .limit(1)
      .toArray();

    if (latestUpload.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: `No hay datos disponibles para el usuario ${userName}`
      });
    }

    data = latestUpload[0];
  }

  // Si se especifica una sección, filtrar
  if (section) {
    const filteredData = {
      ...data,
      sections: data.sections.filter(
        (s: { name: string }) => s.name.toLowerCase() === section.toLowerCase()
      )
    };
    
    return NextResponse.json({
      success: true,
      data: filteredData,
      uploadedAt: data.uploadedAt
    });
  }

  return NextResponse.json({
    success: true,
    data: data,
    uploadedAt: data.uploadedAt
  });
}
