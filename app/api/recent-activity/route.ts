import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

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

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // Obtener las últimas 15 cargas ordenadas por fecha
    const recentUploads = await db
      .collection('excel_uploads')
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
