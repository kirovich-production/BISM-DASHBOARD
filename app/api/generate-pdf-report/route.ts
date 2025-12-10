import { NextRequest, NextResponse } from 'next/server';

interface GraphData {
  viewName: string;
  imageData?: string; // Base64 (para gráficos simples)
  htmlData?: string; // HTML serializado (para contenido complejo)
  period: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { graphs } = await request.json() as { graphs: GraphData[] };
    
    if (!graphs || !Array.isArray(graphs) || graphs.length === 0) {
      return NextResponse.json({ error: 'Graphs array is required' }, { status: 400 });
    }

    // Verificar que tenemos el token de Browserless
    const browserlessToken = process.env.BROWSERLESS_API_TOKEN;
    if (!browserlessToken) {
      console.error('❌ BROWSERLESS_API_TOKEN no configurado');
      return NextResponse.json({ error: 'Browserless token not configured' }, { status: 500 });
    }

    const currentDate = new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generar HTML multipágina con portada
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Gráficos</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0.75in;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', -apple-system, sans-serif;
            color: #1f2937;
            background: white;
          }
          
          /* Portada */
          .cover-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
          }
          
          .cover-title {
            font-size: 48px;
            font-weight: bold;
            color: #4f46e5;
            margin-bottom: 20px;
          }
          
          .cover-subtitle {
            font-size: 24px;
            color: #6b7280;
            margin-bottom: 40px;
          }
          
          .cover-date {
            font-size: 16px;
            color: #9ca3af;
          }
          
          /* Páginas de gráficos */
          .graph-page {
            page-break-before: always;
            page-break-inside: auto;
            padding: 20px 0;
          }
          
          .graph-page:first-of-type {
            page-break-before: auto;
          }
          
          /* Permitir que tablas se dividan naturalmente */
          table {
            page-break-inside: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .graph-header {
            margin-bottom: 20px;
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 15px;
          }
          
          .graph-title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .graph-period {
            font-size: 16px;
            color: #6b7280;
          }
          
          .graph-container {
            margin: 30px 0;
            text-align: center;
          }
          
          .graph-container img {
            max-width: 100%;
            height: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
          }
          
          .graph-notes {
            margin-top: 20px;
            padding: 15px;
            background: #f3f4f6;
            border-left: 4px solid #4f46e5;
            border-radius: 4px;
          }
          
          .graph-notes-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 8px;
          }
          
          .graph-notes-content {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.6;
          }
          
          /* Footer */
          .page-footer {
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <!-- PORTADA -->
        <div class="cover-page">
          <div class="cover-title">📊 Reporte de Gráficos</div>
          <div class="cover-subtitle">${graphs.length} gráfico${graphs.length !== 1 ? 's' : ''} incluido${graphs.length !== 1 ? 's' : ''}</div>
          <div class="cover-date">Generado el ${currentDate}</div>
        </div>
        
        <!-- GRÁFICOS -->
        ${graphs.map((graph) => {
          // Si tiene htmlData, usar el HTML completo (para vistas complejas)
          if (graph.htmlData) {
            return `
              <div class="graph-page">
                <div class="graph-container">
                  ${graph.htmlData}
                </div>
                
                ${graph.notes ? `
                  <div class="graph-notes">
                    <div class="graph-notes-title">📝 Notas:</div>
                    <div class="graph-notes-content">${graph.notes}</div>
                  </div>
                ` : ''}
              </div>
            `;
          } else {
            // Si tiene imageData, usar imagen (para gráficos simples)
            return `
              <div class="graph-page">
                <div class="graph-container">
                  <img src="${graph.imageData}" alt="${graph.viewName}" />
                </div>
                
                ${graph.notes ? `
                  <div class="graph-notes">
                    <div class="graph-notes-title">📝 Notas:</div>
                    <div class="graph-notes-content">${graph.notes}</div>
                  </div>
                ` : ''}
              </div>
            `;
          }
        }).join('')}
        
        <div class="page-footer">
          Reporte generado automáticamente - ${currentDate}
        </div>
      </body>
      </html>
    `;

    // Enviar a Browserless
    const response = await fetch(`https://production-sfo.browserless.io/pdf?token=${browserlessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        html,
        options: {
          displayHeaderFooter: false,
          printBackground: true,
          format: 'A4',
          landscape: true,
          margin: {
            top: '0.75in',
            right: '0.75in',
            bottom: '0.75in',
            left: '0.75in',
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de Browserless:', errorText);
      throw new Error(`Browserless error: ${response.status}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generando PDF de reporte:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
