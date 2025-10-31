import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Obtener la carga más reciente de datos o por período/versión específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const period = searchParams.get('period');
    const version = searchParams.get('version');

    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');
    
    let data;

    if (period) {
      // Filtro base por período
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
          message: 'No hay datos disponibles'
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
