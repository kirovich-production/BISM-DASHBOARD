import { NextRequest, NextResponse } from 'next/server';
import { 
  generatePdfWithBrowserless, 
  isBrowserlessConfigured 
} from '@/lib/browserless';

export async function POST(request: NextRequest) {
  try {
    const { html, options } = await request.json();
    
    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    if (!isBrowserlessConfigured()) {
      console.error('❌ BROWSERLESS_API_TOKEN no configurado');
      return NextResponse.json({ error: 'Browserless token not configured' }, { status: 500 });
    }

    const result = await generatePdfWithBrowserless(html, options);

    if (!result.success || !result.pdfBuffer) {
      console.error('❌ Browserless error:', result.error);
      return NextResponse.json({ 
        error: result.error || 'Browserless failed'
      }, { status: 500 });
    }

    return new NextResponse(result.pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': result.pdfBuffer.byteLength.toString(),
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