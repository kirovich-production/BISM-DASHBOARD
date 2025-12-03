import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Obtener proveedores por userId, sucursal y período
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sucursal = searchParams.get('sucursal');
    const periodo = searchParams.get('periodo');
    const search = searchParams.get('search');

    if (!userId || !sucursal || !periodo) {
      return NextResponse.json({
        success: false,
        error: 'userId, sucursal y periodo son requeridos'
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedores');

    let query: any = {
      userId,
      sucursal,
      periodo
    };

    if (search) {
      query.$or = [
        { rut: { $regex: search, $options: 'i' } },
        { nombre: { $regex: search, $options: 'i' } }
      ];
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

// PUT: Actualizar observaciones de un proveedor específico por userId, sucursal y período
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sucursal, periodo, rut, observaciones } = body;

    if (!userId || !sucursal || !periodo || !rut) {
      return NextResponse.json({
        success: false,
        error: 'userId, sucursal, periodo y RUT son requeridos'
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedores');

    const result = await proveedoresCollection.updateOne(
      { userId, sucursal, periodo, rut },
      { $set: { observaciones: observaciones || '' } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Proveedor no encontrado en este período'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Observaciones actualizadas correctamente'
    });

  } catch (error) {
    console.error('[proveedores-excel PUT] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar observaciones',
    }, { status: 500 });
  }
}
