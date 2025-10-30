import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Obtener la carga más reciente de datos desde MongoDB
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');
    
    // Obtener el documento más reciente
    const latestUpload = await collection
      .find({})
      .sort({ uploadedAt: -1 })
      .limit(1)
      .toArray();

    if (latestUpload.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No hay datos disponibles'
      });
    }

    const data = latestUpload[0];

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
