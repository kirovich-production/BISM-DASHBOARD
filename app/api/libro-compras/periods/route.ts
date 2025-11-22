import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Obtener todos los períodos disponibles de Libro de Compras por usuario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Falta parámetro requerido: userId',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const libroComprasCollection = db.collection('libroCompras');

    // Obtener todos los documentos del usuario, ordenados por período descendente
    const documents = await libroComprasCollection
      .find({ userId })
      .project({ periodo: 1, periodLabel: 1, _id: 0 })
      .sort({ periodo: -1 })
      .toArray();

    const periods = documents.map(doc => ({
      periodo: doc.periodo,
      periodLabel: doc.periodLabel
    }));

    return NextResponse.json({
      success: true,
      periods
    });

  } catch (error) {
    console.error('[libro-compras/periods GET] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener períodos',
      periods: []
    }, { status: 500 });
  }
}
