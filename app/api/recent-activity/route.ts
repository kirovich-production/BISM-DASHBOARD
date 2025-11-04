import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';

interface Upload {
  _id: { toString: () => string };
  isAutomatic?: boolean;
  fileName: string;
  period: string;
  periodLabel: string;
  version: number;
  sections: Array<{ name: string; data: unknown[] }>;
  uploadedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');

    // IMPORTANTE: ahora necesitamos userName para saber qué colección consultar
    if (!userName) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del usuario (userName)' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Usar colección específica del usuario
    const collectionName = getUserCollectionName(userName);
    
    // Obtener las últimas 15 cargas ordenadas por fecha de este usuario
    const recentUploads = await db
      .collection(collectionName)
      .find({})
      .sort({ uploadedAt: -1 })
      .limit(15)
      .toArray() as unknown as Upload[];

    const activities = recentUploads.map(upload => ({
      id: upload._id.toString(),
      type: upload.isAutomatic ? 'automatic' : 'manual',
      fileName: upload.fileName,
      period: upload.period,
      periodLabel: upload.periodLabel,
      version: upload.version,
      sections: upload.sections.map(s => s.name),
      recordsCount: upload.sections.reduce((acc, s) => acc + s.data.length, 0),
      timestamp: upload.uploadedAt,
    }));

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener actividad reciente' },
      { status: 500 }
    );
  }
}
