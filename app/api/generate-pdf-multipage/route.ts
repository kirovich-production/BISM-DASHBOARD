import { NextRequest, NextResponse } from 'next/server';
import { 
  generatePdfWithBrowserless, 
  isBrowserlessConfigured 
} from '@/lib/browserless';

// Estilos CSS para PDF multipágina
const MULTIPAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  @page {
    size: A4 landscape;
    margin: 0.5in;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #1f2937;
    background: white;
    padding: 15px;
  }
  
  .page-break {
    page-break-before: always;
  }
  
  .page-break:first-child {
    page-break-before: auto;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  
  th, td {
    padding: 8px 6px;
    text-align: left;
  }
  
  th {
    border: 1px solid #ffffff !important;
  }
  
  td {
    border: 1px solid #d1d5db !important;
  }
  
  th {
    background-color: #1e40af !important;
    background: #1e40af !important;
    font-weight: 600;
    color: #ffffff !important;
    font-size: 9px;
    text-transform: none;
    letter-spacing: 0.05em;
  }
  
  /* Estilos para headers de diferentes niveles */
  thead tr:first-child th {
    background-color: #1e40af !important;
    background: #1e40af !important;
  }
  
  thead tr:nth-child(2) th {
    background-color: #3b82f6 !important;
    background: #3b82f6 !important;
  }
  
  .item-column {
    background-color: #e0f2fe !important;
    background: #e0f2fe !important;
    font-weight: 500;
    width: 160px;
    max-width: 160px;
  }
  
  .number-cell {
    text-align: right;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 9px;
    white-space: nowrap;
    background-color: #fafafa !important;
    background: #fafafa !important;
  }
  
  tbody tr:nth-child(even) .number-cell {
    background-color: #f0f9ff !important;
    background: #f0f9ff !important;
  }
  
  tbody tr:nth-child(even) .item-column {
    background-color: #dbeafe !important;
    background: #dbeafe !important;
  }
  
  h1 {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 5px;
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { pages } = await request.json();
    
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'Pages array is required' }, { status: 400 });
    }

    if (!isBrowserlessConfigured()) {
      console.error('❌ BROWSERLESS_API_TOKEN no configurado');
      return NextResponse.json({ error: 'Browserless token not configured' }, { status: 500 });
    }

    // Combinar todas las páginas en un solo HTML con page breaks
    const combinedHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte Consolidado Multi-página</title>
        <style>${MULTIPAGE_STYLES}</style>
      </head>
      <body>
        ${pages.map((pageHtml: string, index: number) => `
          <div class="${index > 0 ? 'page-break' : ''}">
            ${pageHtml}
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const result = await generatePdfWithBrowserless(combinedHtml, {
      preferCSSPageSize: true,
    });

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
    console.error('❌ Error en API PDF multi-página:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}