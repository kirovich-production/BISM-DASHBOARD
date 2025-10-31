import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await request.json(); // Leer el body para evitar errores

    // Siempre devolver error para usar fallback del cliente
    // El fallback funciona perfectamente con los gráficos
    console.log('📄 API route llamada - redirigiendo a fallback del cliente');
    
    return NextResponse.json(
      { 
        error: 'Server-side PDF generation disabled',
        message: 'Using client-side PDF generation with dom-to-image',
        useClientFallback: true,
      },
      { status: 503 }
    );

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Error in PDF API',
        message: error instanceof Error ? error.message : 'Unknown error',
        useClientFallback: true,
      },
      { status: 500 }
    );
  }
}
