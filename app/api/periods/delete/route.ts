import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Eliminar un período específico
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del período' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');
    
    // Eliminar el documento
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'No se encontró el período especificado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Período eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar período:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el período' },
      { status: 500 }
    );
  }
}
