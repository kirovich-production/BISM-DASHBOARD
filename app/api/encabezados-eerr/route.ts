import { NextResponse } from 'next/server';
import { ENCABEZADOS_EERR } from '@/lib/encabezadosEERR';

// GET /api/encabezados-eerr - Retorna lista de encabezados disponibles
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      encabezados: ENCABEZADOS_EERR,
    });
  } catch (error) {
    console.error('❌ Error obteniendo encabezados EERR:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener encabezados' },
      { status: 500 }
    );
  }
}
