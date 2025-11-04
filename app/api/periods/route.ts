import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Obtener todos los períodos disponibles con sus versiones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');
    
    // Filtro por usuario si se proporciona
    const filter = userId ? { userId } : {};
    
    // Obtener todos los documentos (filtrados por usuario si aplica)
    const allPeriods = await collection
      .find(filter, {
        projection: {
          _id: 1,
          userId: 1,
          period: 1,
          periodLabel: 1,
          fileName: 1,
          version: 1,
          uploadedAt: 1
        }
      })
      .sort({ period: -1, version: -1 }) // Ordenar por período y versión descendente
      .toArray();

    // Agrupar por período y contar versiones
    const periodMap = new Map();
    
    allPeriods.forEach(p => {
      if (!periodMap.has(p.period)) {
        periodMap.set(p.period, {
          ...p,
          versionCount: 1,
          versions: [p]
        });
      } else {
        const existing = periodMap.get(p.period);
        existing.versionCount++;
        existing.versions.push(p);
      }
    });

    // Convertir a array y formatear
    const periods = Array.from(periodMap.values()).map(p => ({
      _id: p._id.toString(),
      userId: p.userId,
      period: p.period,
      periodLabel: p.periodLabel,
      fileName: p.fileName,
      version: p.version,
      uploadedAt: p.uploadedAt,
      versionCount: p.versionCount,
      versions: p.versions.map((v: { _id: { toString: () => string }; version: number; fileName: string; uploadedAt: Date }) => ({
        _id: v._id.toString(),
        version: v.version,
        fileName: v.fileName,
        uploadedAt: v.uploadedAt
      }))
    }));

    return NextResponse.json({
      success: true,
      periods,
      userId: userId || null
    });

  } catch (error) {
    console.error('Error al obtener períodos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los períodos' },
      { status: 500 }
    );
  }
}
