import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';
import { aggregateMultiplePeriodsToEERR } from '@/lib/libroComprasAggregator';
import { convertEERRDataToExcelRows, sumarTablas } from '@/lib/consolidadoHelper';
import { LibroComprasData } from '@/types';

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
      console.log('🔍 API route.ts - userId:', userId, 'sucursal:', sucursal, 'period:', period);
      const libroComprasCollection = db.collection('libroCompras');
      
      // Si se especifica sucursal, retornar solo esa sucursal
      if (sucursal) {
      console.log('✅ API route.ts - Entrando a bloque de sucursal específica:', sucursal);
      if (sucursal !== 'Sevilla' && sucursal !== 'Labranza') {
        return NextResponse.json(
          { error: 'Sucursal debe ser "Sevilla" o "Labranza"' },
          { status: 400 }
        );
      }

      // Obtener documentos de la sucursal especificada
      let sucursalDocs: LibroComprasData[] = [];
      
      if (period) {
        // Buscar documento específico del período
        const doc = await libroComprasCollection.findOne({ userId, sucursal, periodo: period }) as LibroComprasData | null;
        if (doc) sucursalDocs.push(doc);
      } else {
        // Traer todos los documentos de la sucursal
        const docs = await libroComprasCollection.find({ userId, sucursal }).sort({ periodo: 1 }).toArray();
        sucursalDocs = docs as unknown as LibroComprasData[];
      }
      
      console.log('📊 API route.ts - Documentos encontrados:', sucursalDocs.length);
      
      if (sucursalDocs.length === 0) {
        console.log('❌ API route.ts - No hay documentos para sucursal:', sucursal);
        return NextResponse.json({
          success: true,
          data: null,
          message: `No hay datos de Libro de Compras para ${sucursal}${period ? ` en ${period}` : ''}`
        });
      }
      
      const valoresManualesCollection = db.collection('valoresManuales');
      
      // Preparar documentos con valores manuales
      const docsConValores = await Promise.all(
        sucursalDocs.map(async (doc) => {
          const valoresManualesDoc = await valoresManualesCollection.find({
            userId,
            periodo: doc.periodo,
            sucursal
          }).toArray();
          
          const valoresManuales: { [cuenta: string]: number } = {};
          valoresManualesDoc.forEach(v => {
            valoresManuales[v.cuenta] = v.monto;
          });
          
          return {
            periodo: doc.periodo,
            transacciones: doc.transacciones,
            valoresManuales
          };
        })
      );
      
      // Usar función multi-período
      const eerrData = aggregateMultiplePeriodsToEERR(docsConValores);
      
      const firstDoc = sucursalDocs[0];
      const lastDoc = sucursalDocs[sucursalDocs.length - 1];
      
      const responseData: {
        period: string;
        periodLabel: string;
        version: number;
        uploadedAt: Date;
        sevilla?: typeof eerrData;
        labranza?: typeof eerrData;
      } = {
        period: period || firstDoc.periodo,
        periodLabel: firstDoc.periodLabel,
        version: 1,
        uploadedAt: lastDoc.updatedAt || lastDoc.createdAt
      };
      
      if (sucursal === 'Sevilla') {
        responseData.sevilla = eerrData;
      } else if (sucursal === 'Labranza') {
        responseData.labranza = eerrData;
      }
      
      console.log('✅ API route.ts - Retornando datos para sucursal:', sucursal);
      console.log('📦 API route.ts - responseData keys:', Object.keys(responseData));
      
      return NextResponse.json({
        success: true,
        data: responseData,
        uploadedAt: responseData.uploadedAt
      });
      }
      
      // Sin sucursal especificada: generar Labranza, Sevilla y Consolidado
      const filter: { userId: string; periodo?: string } = { userId };
      if (period) {
        filter.periodo = period;
      }
      
      // Obtener documentos de ambas sucursales
      // Si no hay período, traer TODOS los documentos de cada sucursal
      let labranzaDocsFiltered: LibroComprasData[] = [];
      let sevillaDocsFiltered: LibroComprasData[] = [];
      
      if (period) {
        // Buscar documento específico del período
        const labranzaDoc = await libroComprasCollection.findOne({ ...filter, sucursal: 'Labranza' }) as LibroComprasData | null;
        const sevillaDoc = await libroComprasCollection.findOne({ ...filter, sucursal: 'Sevilla' }) as LibroComprasData | null;
        
        if (labranzaDoc) labranzaDocsFiltered.push(labranzaDoc);
        if (sevillaDoc) sevillaDocsFiltered.push(sevillaDoc);
      } else {
        // Traer todos los documentos de cada sucursal
        const labranzaDocs = await libroComprasCollection.find({ userId, sucursal: 'Labranza' }).sort({ periodo: 1 }).toArray();
        const sevillaDocs = await libroComprasCollection.find({ userId, sucursal: 'Sevilla' }).sort({ periodo: 1 }).toArray();
        
        labranzaDocsFiltered = labranzaDocs as unknown as LibroComprasData[];
        sevillaDocsFiltered = sevillaDocs as unknown as LibroComprasData[];
      }
      
      if (labranzaDocsFiltered.length === 0 && sevillaDocsFiltered.length === 0) {
        return NextResponse.json({
          success: true,
          data: null,
          message: `No hay datos de Libro de Compras${period ? ` para ${period}` : ''}`
        });
      }
      
      const valoresManualesCollection = db.collection('valoresManuales');
      
      // Determinar período para respuesta
      const firstDoc = labranzaDocsFiltered[0] || sevillaDocsFiltered[0];
      const lastDocLabranza = labranzaDocsFiltered[labranzaDocsFiltered.length - 1];
      const lastDocSevilla = sevillaDocsFiltered[sevillaDocsFiltered.length - 1];
      const latestUploadedAt = lastDocLabranza?.updatedAt || lastDocSevilla?.updatedAt || firstDoc?.updatedAt;
      
      const responseData: {
        period: string;
        periodLabel: string;
        version: number;
        uploadedAt: Date;
        consolidado: Array<{ name: string; data: unknown }>;
        labranza?: ReturnType<typeof aggregateMultiplePeriodsToEERR>;
        sevilla?: ReturnType<typeof aggregateMultiplePeriodsToEERR>;
      } = {
        period: period || firstDoc?.periodo,
        periodLabel: firstDoc?.periodLabel,
        version: 1,
        uploadedAt: latestUploadedAt,
        consolidado: []
      };
      
      // Generar datos de Labranza (multi-período)
      if (labranzaDocsFiltered.length > 0) {
        // Preparar documentos con valores manuales
        const labranzaDocsConValores = await Promise.all(
          labranzaDocsFiltered.map(async (doc) => {
            const valoresManualesLabranza = await valoresManualesCollection.find({
              userId,
              periodo: doc.periodo,
              sucursal: 'Labranza'
            }).toArray();
            
            const vmLabranza: { [cuenta: string]: number } = {};
            valoresManualesLabranza.forEach(v => {
              vmLabranza[v.cuenta] = v.monto;
            });
            
            return {
              periodo: doc.periodo,
              transacciones: doc.transacciones,
              valoresManuales: vmLabranza
            };
          })
        );
        
        const labranzaData = aggregateMultiplePeriodsToEERR(labranzaDocsConValores);
        
        responseData.labranza = labranzaData;
        
        // Convertir a formato plano para TableView
        const labranzaPlana = convertEERRDataToExcelRows(labranzaData);
        responseData.consolidado.push({
          name: 'Labranza',
          data: labranzaPlana
        });
      }
      
      // Generar datos de Sevilla (multi-período)
      if (sevillaDocsFiltered.length > 0) {
        // Preparar documentos con valores manuales
        const sevillaDocsConValores = await Promise.all(
          sevillaDocsFiltered.map(async (doc) => {
            const valoresManualesSevilla = await valoresManualesCollection.find({
              userId,
              periodo: doc.periodo,
              sucursal: 'Sevilla'
            }).toArray();
            
            const vmSevilla: { [cuenta: string]: number } = {};
            valoresManualesSevilla.forEach(v => {
              vmSevilla[v.cuenta] = v.monto;
            });
            
            return {
              periodo: doc.periodo,
              transacciones: doc.transacciones,
              valoresManuales: vmSevilla
            };
          })
        );
        
        const sevillaData = aggregateMultiplePeriodsToEERR(sevillaDocsConValores);
        
        responseData.sevilla = sevillaData;
        
        // Convertir a formato plano para TableView
        const sevillaPlana = convertEERRDataToExcelRows(sevillaData);
        responseData.consolidado.push({
          name: 'Sevilla',
          data: sevillaPlana
        });
      }
      
      // Generar tabla Consolidados (suma de Labranza + Sevilla)
      if (labranzaDocsFiltered.length > 0 && sevillaDocsFiltered.length > 0 && responseData.labranza && responseData.sevilla) {
        const labranzaPlana = convertEERRDataToExcelRows(responseData.labranza);
        const sevillaPlana = convertEERRDataToExcelRows(responseData.sevilla);
        const consolidadosPlana = sumarTablas(labranzaPlana, sevillaPlana);
        
        responseData.consolidado.push({
          name: 'Consolidados',
          data: consolidadosPlana
        });
      }
      
      console.log('API Response - consolidado structure:', {
        consolidadoLength: responseData.consolidado.length,
        sections: responseData.consolidado.map(s => ({ name: s.name, dataLength: Array.isArray(s.data) ? s.data.length : 0 }))
      });
      
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
