import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📄 API PDF: Iniciando generación de PDF con nuevo endpoint...');
    
    const { html, options } = await request.json();
    
    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Verificar que tenemos el token de Browserless
    const browserlessToken = process.env.BROWSERLESS_API_TOKEN;
    if (!browserlessToken) {
      console.error('❌ BROWSERLESS_API_TOKEN no configurado');
      return NextResponse.json({ error: 'Browserless token not configured' }, { status: 500 });
    }

    console.log('📤 Enviando HTML a Browserless.io...');
    const response = await fetch(`https://production-sfo.browserless.io/pdf?token=${browserlessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        options: {
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
          displayHeaderFooter: false,
          ...options
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Browserless error:', response.status, errorText);
      return NextResponse.json({ 
        error: `Browserless failed: ${response.status} - ${errorText}` 
      }, { status: 500 });
    }

    // Obtener el PDF como buffer
    const pdfBuffer = await response.arrayBuffer();
    
    console.log('✅ PDF generado exitosamente');
    
    // Retornar el PDF como respuesta
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error en API PDF:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}