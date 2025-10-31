import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID de documento requerido' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');

    // Eliminar el documento
    const result = await collection.deleteOne({ _id: new ObjectId(documentId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el documento' },
      { status: 500 }
    );
  }
}
