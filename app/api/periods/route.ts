import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';

// Obtener todos los períodos disponibles con sus versiones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName'); // Para Excel tradicional
    const userId = searchParams.get('userId'); // Para Libro de Compras
    const sucursal = searchParams.get('sucursal'); // Nuevo parámetro

    // IMPORTANTE: necesitamos userName (Excel) o userId (LC) según el caso
    if (!userName && !userId) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del usuario (userName) o userId' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Si se especifica sucursal, usar colección libroCompras
    if (sucursal) {
      if (sucursal !== 'Sevilla' && sucursal !== 'Labranza') {
        return NextResponse.json(
          { error: 'Sucursal debe ser "Sevilla" o "Labranza"' },
          { status: 400 }
        );
      }

      const libroComprasCollection = db.collection('libroCompras');
      
      // Obtener períodos de Libro de Compras filtrados por userId y sucursal
      const allPeriods = await libroComprasCollection
        .find(
          { userId: userId || userName, sucursal },
          {
            projection: {
              _id: 1,
              userId: 1,
              periodo: 1,
              periodLabel: 1,
              fileName: 1,
              sucursal: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        )
        .sort({ periodo: -1 })
        .toArray();

      // Formatear períodos para compatibilidad con front-end
      const periods = allPeriods.map(p => ({
        _id: p._id.toString(),
        userId: p.userId,
        period: p.periodo,
        periodLabel: p.periodLabel,
        fileName: p.fileName,
        version: 1, // LC siempre versión 1 por ahora
        uploadedAt: p.updatedAt || p.createdAt,
        versionCount: 1,
        sucursal: p.sucursal
      }));

      return NextResponse.json({
        success: true,
        periods,
        userName,
        sucursal
      });
    }
    
    // Usar colección específica del usuario (Excel EERR tradicional)
    const collectionName = getUserCollectionName(userName || '');
    const collection = db.collection(collectionName);
    
    // Obtener todos los documentos de este usuario
    const allPeriods = await collection
      .find({}, {
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
      userName
    });

  } catch (error) {
    console.error('Error al obtener períodos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los períodos' },
      { status: 500 }
    );
  }
}
