import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Obtener todos los períodos disponibles de Libro de Compras por usuario (opcionalmente filtrado por sucursal)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sucursal = searchParams.get('sucursal'); // Opcional: 'Sevilla' o 'Labranza'

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Falta parámetro requerido: userId',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const libroComprasCollection = db.collection('libroCompras');

    // Construir filtro base
    const filter: Record<string, unknown> = { userId };
    
    // Si se especifica sucursal, agregar al filtro
    if (sucursal) {
      filter.sucursal = sucursal;
    }

    // Obtener todos los documentos del usuario (opcionalmente filtrados por sucursal)
    const documents = await libroComprasCollection
      .find(filter)
      .project({ periodo: 1, periodLabel: 1, sucursal: 1, _id: 0 })
      .sort({ periodo: -1 })
      .toArray();

    const periods = documents.map(doc => ({
      periodo: doc.periodo,
      periodLabel: doc.periodLabel,
      sucursal: doc.sucursal
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
