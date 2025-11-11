import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { html, title = 'dashboard' } = await request.json();

    // Si no hay token de Browserless, usar fallback del cliente
    if (!BROWSERLESS_TOKEN) {
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


    // Llamar a Browserless.io API con configuración de alta calidad
    const browserlessUrl = `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`;
    
    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        options: {
          // Configuraciones básicas mejoradas
          printBackground: true,
          format: 'A4',
          landscape: true,
          
          // Márgenes optimizados
          margin: {
            top: '0.2in',
            bottom: '0.2in', 
            left: '0.2in',
            right: '0.2in',
          },
          
          // Configuraciones de alta calidad (solo las permitidas por Browserless)
          preferCSSPageSize: true,
          displayHeaderFooter: false,
          scale: 1.0,  // Sin escalado para mejor calidad
          
          // Resolución y renderizado mejoradas
          width: 1920,   // Ancho de viewport alto para mejor resolución
          height: 1080,  // Alto de viewport alto para mejor resolución
          
          // Configuraciones de renderizado básicas
          omitBackground: false,
          timeout: 30000,  // 30 segundos timeout
          
          // Configuraciones de PDF específicas
          tagged: false,  // No usar PDF con tags para mejor rendimiento
        },
        
        // Configurar viewport con alta resolución (si está permitido)
        viewport: {
          width: 1920,
          height: 1080,
          isMobile: false,
          hasTouch: false,
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
