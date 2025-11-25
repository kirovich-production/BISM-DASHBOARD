import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Obtener libro de compras por período, usuario y sucursal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const periodo = searchParams.get('periodo');
    const sucursal = searchParams.get('sucursal');

    if (!userId || !periodo || !sucursal) {
      return NextResponse.json({
        success: false,
        message: 'Faltan parámetros requeridos: userId, periodo, sucursal',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const libroComprasCollection = db.collection('libroCompras');

    const document = await libroComprasCollection.findOne({
      userId,
      periodo,
      sucursal
    });

    if (!document) {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron datos para este período',
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('[libro-compras GET] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener datos',
    }, { status: 500 });
  }
}

// PUT: Actualizar una transacción específica
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, periodo, sucursal, transaccionIndex, transaccion } = body;

    if (!userId || !periodo || !sucursal || transaccionIndex === undefined || !transaccion) {
      return NextResponse.json({
        success: false,
        message: 'Faltan datos requeridos: userId, periodo, sucursal, transaccionIndex, transaccion',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const libroComprasCollection = db.collection('libroCompras');

    // Actualizar la transacción específica por índice
    const updateKey = `transacciones.${transaccionIndex}`;
    
    const result = await libroComprasCollection.updateOne(
      { userId, periodo, sucursal },
      {
        $set: {
          [updateKey]: transaccion,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontró el documento',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transacción actualizada exitosamente'
    });

  } catch (error) {
    console.error('[libro-compras PUT] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al actualizar transacción',
    }, { status: 500 });
  }
}

// DELETE: Eliminar libro de compras por período y sucursal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const periodo = searchParams.get('periodo');
    const sucursal = searchParams.get('sucursal');

    if (!userId || !periodo || !sucursal) {
      return NextResponse.json({
        success: false,
        message: 'Faltan parámetros requeridos: userId, periodo, sucursal',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const libroComprasCollection = db.collection('libroCompras');

    const result = await libroComprasCollection.deleteOne({
      userId,
      periodo,
      sucursal
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontró el documento para eliminar',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Libro de compras eliminado exitosamente'
    });

  } catch (error) {
    console.error('[libro-compras DELETE] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al eliminar datos',
    }, { status: 500 });
  }
}
