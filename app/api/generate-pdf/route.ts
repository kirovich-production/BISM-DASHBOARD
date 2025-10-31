import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await request.json();

    // API simplificada - siempre usa fallback del cliente
    console.log('📄 PDF API v2 - Usando fallback del cliente');
    
    return NextResponse.json(
      { 
        error: 'Server-side PDF disabled',
        message: 'Client-side PDF generation active',
        useClientFallback: true,
        version: '2.0'
      },
      { status: 503 }
    );

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'PDF API error',
        message: error instanceof Error ? error.message : 'Unknown',
        useClientFallback: true,
      },
      { status: 500 }
    );
  }
}
