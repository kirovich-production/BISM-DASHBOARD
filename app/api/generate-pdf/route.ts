import { NextRequest, NextResponse } from 'next/server';
import { 
  generateHighQualityPdf, 
  isBrowserlessConfigured 
} from '@/lib/browserless';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { html, title = 'dashboard' } = await request.json();

    // Si no hay token de Browserless, usar fallback del cliente
    if (!isBrowserlessConfigured()) {
      return NextResponse.json(
        { 
          error: 'Browserless token not configured',
          useClientFallback: true,
          version: '3.0-browserless'
        },
        { status: 503 }
      );
    }

    // Llamar a Browserless.io API con configuración de alta calidad
    const result = await generateHighQualityPdf(html);

    if (!result.success || !result.pdfBuffer) {
      return NextResponse.json(
        { 
          error: result.error || 'PDF generation failed',
          useClientFallback: true,
          version: '3.0-browserless'
        },
        { status: 503 }
      );
    }

    return new NextResponse(result.pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title}-${Date.now()}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('❌ Error en PDF API:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'PDF generation failed',
        useClientFallback: true,
        version: '3.0-browserless'
      },
      { status: 500 }
    );
  }
}
