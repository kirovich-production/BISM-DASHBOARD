import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Obtener proveedores cargados desde Excel (colección 'proveedores')
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedores');

    let query = {};

    if (search) {
      query = {
        $or: [
          { rut: { $regex: search, $options: 'i' } },
          { nombre: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const proveedores = await proveedoresCollection
      .find(query)
      .sort({ nombre: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      proveedores
    });

  } catch (error) {
    console.error('[proveedores-excel GET] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener proveedores',
    }, { status: 500 });
  }
}
