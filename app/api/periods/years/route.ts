import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Obtener rango de años disponibles desde la BD
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');
    
    // Obtener todos los períodos únicos
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
