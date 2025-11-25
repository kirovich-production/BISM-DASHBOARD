import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';
import { aggregateLibroComprasToEERR } from '@/lib/libroComprasAggregator';
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
    
    // Si se especifica sucursal, usar datos de Libro de Compras
    if (sucursal) {
      if (sucursal !== 'Sevilla' && sucursal !== 'Labranza') {
        return NextResponse.json(
          { error: 'Sucursal debe ser "Sevilla" o "Labranza"' },
          { status: 400 }
        );
      }

      const libroComprasCollection = db.collection('libroCompras');
      
      // Construir filtro por userId, periodo y sucursal
      const filter: any = { 
        userId: userId || userName,
        sucursal 
      };
      
      if (period) {
        filter.periodo = period;
      }
      
      // Buscar documento de Libro de Compras
      const libroComprasDoc = period 
        ? await libroComprasCollection.findOne(filter)
        : await libroComprasCollection.findOne(
            filter,
            { sort: { periodo: -1 } }
          );
      
      if (!libroComprasDoc) {
        return NextResponse.json({
          success: true,
          data: null,
          message: `No hay datos de Libro de Compras para ${sucursal}${period ? ` en ${period}` : ''}`
        });
      }
      
      // Obtener valores manuales (como Ventas)
      const valoresManualesCollection = db.collection('valoresManuales');
      const valoresManualesDoc = await valoresManualesCollection.find({
        userId,
        periodo: period,
        sucursal
      }).toArray();
      
      const valoresManuales: { [cuenta: string]: number } = {};
      valoresManualesDoc.forEach(v => {
        valoresManuales[v.cuenta] = v.monto;
      });
      
      // Transformar transacciones a formato EERRData
      const libroCompras = libroComprasDoc as unknown as LibroComprasData;
      const eerrData = aggregateLibroComprasToEERR(
        libroCompras.transacciones,
        libroCompras.periodo,
        valoresManuales
      );
      
      // Devolver estructura compatible con UploadedDocument
      // Asignar eerrData a sevilla o labranza según sucursal
      const responseData: any = {
        period: libroCompras.periodo,
        periodLabel: libroCompras.periodLabel,
        version: 1, // Siempre versión 1 para LC por ahora
        uploadedAt: libroCompras.updatedAt || libroCompras.createdAt
      };
      
      if (sucursal === 'Sevilla') {
        responseData.sevilla = eerrData;
      } else if (sucursal === 'Labranza') {
        responseData.labranza = eerrData;
      }
      
      return NextResponse.json({
        success: true,
        data: responseData,
        uploadedAt: libroCompras.updatedAt || libroCompras.createdAt
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
