import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { html, title = 'dashboard' } = await request.json();

    // Si no hay token de Browserless, usar fallback del cliente
    if (!BROWSERLESS_TOKEN) {
      console.log('⚠️ No BROWSERLESS_TOKEN - usando fallback del cliente');
      return NextResponse.json(
        { 
          error: 'Browserless token not configured',
          message: 'Using client-side PDF generation',
          useClientFallback: true,
          version: '3.0-browserless'
        },
        { status: 503 }
      );
    }

    console.log('🚀 Generando PDF con Browserless.io...');

    // Llamar a Browserless.io API (nueva URL)
    const browserlessUrl = `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`;
    
    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        options: {
          printBackground: true,
          format: 'A4',
          landscape: false,
          margin: {
            top: '0.4in',
            bottom: '0.4in',
            left: '0.3in',
            right: '0.3in',
          },
          preferCSSPageSize: false,
          displayHeaderFooter: false,
          scale: 0.8,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Browserless error:', response.status, errorText);
      
      // Si falla Browserless, usar fallback del cliente
      return NextResponse.json(
        { 
          error: `Browserless error: ${response.statusText}`,
          message: errorText,
          useClientFallback: true,
          version: '3.0-browserless'
        },
        { status: 503 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log('✅ PDF generado exitosamente con Browserless.io');

    return new NextResponse(pdfBuffer, {
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
        error: 'PDF generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        useClientFallback: true,
        version: '3.0-browserless'
      },
      { status: 500 }
    );
  }
}
