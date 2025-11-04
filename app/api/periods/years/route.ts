import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';

// Obtener rango de años disponibles desde la BD
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
    const collection = db.collection(collectionName);
    
    // Obtener todos los períodos únicos de este usuario
    const periods = await collection
      .find({}, { projection: { period: 1 } })
      .toArray();

    if (periods.length === 0) {
      // Si no hay datos, devolver año actual
      const currentYear = new Date().getFullYear();
      return NextResponse.json({
        success: true,
        minYear: currentYear,
        maxYear: currentYear,
        years: [currentYear]
      });
    }

    // Extraer años de los períodos (formato: YYYY-MM)
    const years = periods.map(p => parseInt(p.period.split('-')[0]));
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Generar array de años desde min hasta max + 1 (para permitir carga futura)
    const yearRange = [];
    for (let year = maxYear + 1; year >= minYear; year--) {
      yearRange.push(year);
    }

    return NextResponse.json({
      success: true,
      minYear,
      maxYear,
      years: yearRange
    });

  } catch (error) {
    console.error('Error al obtener rango de años:', error);
    return NextResponse.json(
      { error: 'Error al obtener el rango de años' },
      { status: 500 }
    );
  }
}
