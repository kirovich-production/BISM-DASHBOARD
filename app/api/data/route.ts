import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';
import { aggregateMultiplePeriodsToEERR } from '@/lib/libroComprasAggregator';
import { convertEERRDataToExcelRows, sumarTablas } from '@/lib/consolidadoHelper';
import { LibroComprasData, LibroComprasTransaction } from '@/types';
import { ObjectId } from 'mongodb';
import { Collection } from 'mongodb';

// Helper: Preparar documentos con valores manuales y combinar transacciones
async function prepararDocumentosConValores(
  docs: LibroComprasData[],
  userId: string,
  sucursal: string,
  valoresManualesCollection: Collection
) {
  return Promise.all(
    docs.map(async (doc) => {
      const valoresManualesDocs = await valoresManualesCollection.find({
        userId,
        periodo: doc.periodo,
        sucursal
      }).toArray();
      
      const valoresManuales: { [cuenta: string]: number } = {};
      valoresManualesDocs.forEach(v => {
        valoresManuales[v.cuenta] = v.monto;
      });
      
      // Combinar transacciones del Excel + filas manuales (doc.data)
      const docData = doc as LibroComprasData & { data?: LibroComprasTransaction[] };
      const transaccionesExcel = doc.transacciones || [];
      const transaccionesManuales = docData.data || [];
      const todasLasTransacciones = [
        ...transaccionesExcel,
        ...transaccionesManuales
      ];
      

      
      return {
        periodo: doc.periodo,
        transacciones: todasLasTransacciones,
        valoresManuales
      };
    })
  );
}

// Obtener la carga más reciente de datos o por período/versión específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const period = searchParams.get('period');
    const version = searchParams.get('version');
    const userName = searchParams.get('userName'); // Para Excel tradicional
    const userId = searchParams.get('userId'); // Para Libro de Compras
    const sucursal = searchParams.get('sucursal'); // Nuevo parámetro para filtrar por sucursal

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
      const libroComprasCollection = db.collection('libroCompras');
      
      // Si se especifica sucursal, retornar solo esa sucursal
      if (sucursal) {

      // Obtener documentos de la sucursal especificada
      let sucursalDocs: LibroComprasData[] = [];
      
      if (period) {
        // Buscar AMBOS documentos (ObjectId Y string) para el período
        const docObjectId = await libroComprasCollection.findOne({ 
          userId: new ObjectId(userId), 
          sucursal, 
          periodo: period 
        }) as LibroComprasData | null;
        
        const docString = await libroComprasCollection.findOne({ 
          userId: userId, 
          sucursal, 
          periodo: period 
        }) as LibroComprasData | null;
        
        // Combinar transacciones de ambos documentos
        if (docObjectId || docString) {
          const transaccionesExcel = docString?.transacciones || [];
          const transaccionesManuales = (docObjectId as LibroComprasData & { data?: LibroComprasTransaction[] })?.data || [];
          
          const docCombinado: LibroComprasData = {
            userId: userId,
            periodo: period,
            periodLabel: (docObjectId || docString)!.periodLabel,
            sucursal: sucursal,
            fileName: (docObjectId || docString)!.fileName || 'manual',
            transacciones: [...transaccionesExcel, ...transaccionesManuales],
            createdAt: (docObjectId || docString)!.createdAt,
            updatedAt: (docObjectId || docString)!.updatedAt
          };
          
          sucursalDocs.push(docCombinado);
        }
      } else {
        // Traer TODOS los documentos (ObjectId Y string) y combinar por periodo
        const docsObjectId = await libroComprasCollection.find({ 
          userId: new ObjectId(userId), 
          sucursal 
        }).sort({ periodo: 1 }).toArray();
        
        const docsString = await libroComprasCollection.find({ 
          userId: userId, 
          sucursal 
        }).sort({ periodo: 1 }).toArray();
        
        // Combinar documentos por periodo
        const periodoMap = new Map<string, LibroComprasData>();
        
        // Procesar documentos con transacciones del Excel (userId string)
        for (const doc of docsString) {
          periodoMap.set(doc.periodo, {
            userId: userId,
            periodo: doc.periodo,
            periodLabel: doc.periodLabel,
            sucursal: sucursal,
            fileName: doc.fileName || 'manual',
            transacciones: doc.transacciones || [],
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          });
        }
        
        // Agregar transacciones manuales (userId ObjectId)
        for (const doc of docsObjectId) {
          const docData = doc as unknown as LibroComprasData & { data?: LibroComprasTransaction[] };
          const existing = periodoMap.get(doc.periodo);
          
          if (existing) {
            existing.transacciones = [
              ...existing.transacciones,
              ...(docData.data || [])
            ];
          } else {
            periodoMap.set(doc.periodo, {
              userId: userId,
              periodo: doc.periodo,
              periodLabel: doc.periodLabel,
              sucursal: sucursal,
              fileName: doc.fileName || 'manual',
              transacciones: docData.data || [],
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt
            });
          }
        }
        
        sucursalDocs = Array.from(periodoMap.values());
      }
      
      if (sucursalDocs.length === 0) {
        return NextResponse.json({
          success: true,
          data: null,
          message: `No hay datos de Libro de Compras para ${sucursal}${period ? ` en ${period}` : ''}`
        });
      }
      
      const valoresManualesCollection = db.collection('valoresManuales');
      
      // Preparar documentos con valores manuales (usando helper)
      const docsConValores = await prepararDocumentosConValores(
        sucursalDocs,
        userId,
        sucursal,
        valoresManualesCollection
      );
      
      // Usar función multi-período
      const eerrData = aggregateMultiplePeriodsToEERR(docsConValores);
      
      const firstDoc = sucursalDocs[0];
      const lastDoc = sucursalDocs[sucursalDocs.length - 1];
      
      // Crear slug de la sucursal para propiedad dinámica
      const sucursalSlug = sucursal.toLowerCase().replace(/\s+/g, '_');
      
      const responseData: {
        period: string;
        periodLabel: string;
        version: number;
        uploadedAt: Date;
        [key: string]: unknown;  // Permitir propiedades dinámicas
      } = {
        period: period || firstDoc.periodo,
        periodLabel: firstDoc.periodLabel,
        version: 1,
        uploadedAt: lastDoc.updatedAt || lastDoc.createdAt
      };
      
      // Asignar datos usando slug dinámico
      responseData[sucursalSlug] = eerrData;
      
      return NextResponse.json({
        success: true,
        data: responseData,
        uploadedAt: responseData.uploadedAt
      });
      }
      
      // Sin sucursal especificada: cargar todas las sucursales del usuario dinámicamente
      const filter: { userId: string; periodo?: string } = { userId };
      if (period) {
        filter.periodo = period;
      }
      
      // Primero obtener las sucursales del usuario desde la colección users
      const usersCollection = db.collection('users');
      const userDoc = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!userDoc || !userDoc.sucursales || userDoc.sucursales.length === 0) {
        return NextResponse.json({
          success: true,
          data: null,
          message: 'Usuario no tiene sucursales asignadas'
        });
      }
      
      const userSucursales: string[] = userDoc.sucursales;
      
      // Obtener documentos de todas las sucursales del usuario
      const sucursalesDocsMap: { [sucursal: string]: LibroComprasData[] } = {};
      
      for (const sucursalName of userSucursales) {
        if (period) {
          // Buscar AMBOS documentos (ObjectId Y string)
          const docObjectId = await libroComprasCollection.findOne({ 
            userId: new ObjectId(userId), 
            sucursal: sucursalName, 
            periodo: period 
          }) as LibroComprasData | null;
          
          const docString = await libroComprasCollection.findOne({ 
            userId: userId, 
            sucursal: sucursalName, 
            periodo: period 
          }) as LibroComprasData | null;
          
          // Combinar transacciones
          if (docObjectId || docString) {
            const transaccionesExcel = docString?.transacciones || [];
            const transaccionesManuales = (docObjectId as LibroComprasData & { data?: LibroComprasTransaction[] })?.data || [];
            
            const docCombinado: LibroComprasData = {
              userId: userId,
              periodo: period,
              periodLabel: (docObjectId || docString)!.periodLabel,
              sucursal: sucursalName,
              fileName: (docObjectId || docString)!.fileName || 'manual',
              transacciones: [...transaccionesExcel, ...transaccionesManuales],
              createdAt: (docObjectId || docString)!.createdAt,
              updatedAt: (docObjectId || docString)!.updatedAt
            };
            
            sucursalesDocsMap[sucursalName] = [docCombinado];
          }
        } else {
          // Traer TODOS los documentos y combinar por periodo
          const docsObjectId = await libroComprasCollection.find({ 
            userId: new ObjectId(userId), 
            sucursal: sucursalName 
          }).sort({ periodo: 1 }).toArray();
          
          const docsString = await libroComprasCollection.find({ 
            userId: userId, 
            sucursal: sucursalName 
          }).sort({ periodo: 1 }).toArray();
          
          // Combinar por periodo
          const periodoMap = new Map<string, LibroComprasData>();
          
          for (const doc of docsString) {
            periodoMap.set(doc.periodo, {
              userId: userId,
              periodo: doc.periodo,
              periodLabel: doc.periodLabel,
              sucursal: sucursalName,
              fileName: doc.fileName || 'manual',
              transacciones: doc.transacciones || [],
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt
            });
          }
          
          for (const doc of docsObjectId) {
            const docData = doc as unknown as LibroComprasData & { data?: LibroComprasTransaction[] };
            const existing = periodoMap.get(doc.periodo);
            
            if (existing) {
              existing.transacciones = [
                ...existing.transacciones,
                ...(docData.data || [])
              ];
            } else {
              periodoMap.set(doc.periodo, {
                userId: userId,
                periodo: doc.periodo,
                periodLabel: doc.periodLabel,
                sucursal: sucursalName,
                fileName: doc.fileName || 'manual',
                transacciones: docData.data || [],
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
              });
            }
          }
          
          const docsCombinados = Array.from(periodoMap.values());
          if (docsCombinados.length > 0) {
            sucursalesDocsMap[sucursalName] = docsCombinados;
          }
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
      
      const valoresManualesCollection = db.collection('valoresManuales');
      
      // Determinar período para respuesta
      const firstDoc = totalDocs[0];
      const lastDoc = totalDocs[totalDocs.length - 1];
      const latestUploadedAt = lastDoc?.updatedAt || lastDoc?.createdAt || firstDoc?.updatedAt || firstDoc?.createdAt;
      
      const responseData: {
        period: string;
        periodLabel: string;
        version: number;
        uploadedAt: Date;
        consolidado: Array<{ name: string; data: unknown }>;
        [key: string]: unknown;  // Permitir propiedades dinámicas para sucursales
      } = {
        period: period || firstDoc?.periodo,
        periodLabel: firstDoc?.periodLabel,
        version: 1,
        uploadedAt: latestUploadedAt,
        consolidado: []
      };
      
      // Generar datos EERR para cada sucursal dinámicamente
      const sucursalesEERRData: { [sucursal: string]: ReturnType<typeof aggregateMultiplePeriodsToEERR> } = {};
      const sucursalesPlanas: { [sucursal: string]: ReturnType<typeof convertEERRDataToExcelRows> } = {};
      
      for (const [sucursalName, docs] of Object.entries(sucursalesDocsMap)) {
        if (docs.length > 0) {
          // Preparar documentos con valores manuales (usando helper)
          const docsConValores = await prepararDocumentosConValores(
            docs,
            userId,
            sucursalName,
            valoresManualesCollection
          );
          
          // Generar EERR
          const eerrData = aggregateMultiplePeriodsToEERR(docsConValores);
          
          // Crear slug para propiedad dinámica
          const sucursalSlug = sucursalName.toLowerCase().replace(/\s+/g, '_');
          
          // Guardar en responseData con slug
          responseData[sucursalSlug] = eerrData;
          sucursalesEERRData[sucursalName] = eerrData;
          
          // Convertir a formato plano para TableView
          const plana = convertEERRDataToExcelRows(eerrData);
          sucursalesPlanas[sucursalName] = plana;
          
          responseData.consolidado.push({
            name: sucursalName,
            data: plana
          });
        }
      }
      
      // Generar tabla Consolidados (suma de todas las sucursales)
      if (Object.keys(sucursalesPlanas).length > 1) {
        const tablasPlanas = Object.values(sucursalesPlanas);
        let consolidadosPlana = tablasPlanas[0];
        
        // Sumar todas las tablas
        for (let i = 1; i < tablasPlanas.length; i++) {
          consolidadosPlana = sumarTablas(consolidadosPlana, tablasPlanas[i]);
        }
        
        responseData.consolidado.push({
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
    
    // Usar colección específica del usuario (Excel EERR tradicional)
    const collectionName = getUserCollectionName(userName || '');
    const collection = db.collection(collectionName);
    
    let data;

    if (period) {
      // Filtro base por período (ya no necesitamos userId porque cada usuario tiene su colección)
      const filter: { period: string; version?: number } = { period };
      
      // Si se especifica versión, agregarla al filtro
      if (version) {
        filter.version = parseInt(version);
        data = await collection.findOne(filter);
      } else {
        // Si no se especifica versión, obtener la más reciente
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
      // Obtener el documento más reciente (por período y versión)
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

  } catch (error) {
    console.error('Error al obtener datos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos' },
      { status: 500 }
    );
  }
}
