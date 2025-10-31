import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const maxDuration = 60; // Tiempo máximo de ejecución: 60 segundos

export async function POST(request: NextRequest) {
  let browser;
  
  try {
    const { html, title = 'dashboard' } = await request.json();

    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Iniciando Puppeteer para generar PDF...');

    // Determinar si estamos en producción (Vercel) o desarrollo (local)
    const isProduction = process.env.VERCEL === '1';
    
    // Lanzar navegador
    browser = await puppeteer.launch({
      headless: true,
      args: isProduction
        ? [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
          ]
        : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
      executablePath: isProduction
        ? await chromium.executablePath()
        : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome',
    });

    const page = await browser.newPage();

    // Configurar viewport para captura de alta calidad
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 2, // Retina display (2x resolution)
    });

    // Establecer el contenido HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0', // Esperar a que todo cargue
      timeout: 30000,
    });

    console.log('⏳ Esperando a que las imágenes se carguen...');

    // Esperar a que todas las imágenes se carguen completamente
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });

    // Dar un pequeño tiempo adicional para asegurar el renderizado
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📄 Generando PDF...');

    // Generar PDF con opciones optimizadas
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // CRÍTICO: Incluir fondos y gradientes
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
    });

    await browser.close();

    console.log('✅ PDF generado exitosamente');

    // Devolver el PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title}-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    
    if (browser) {
      await browser.close();
    }

    return NextResponse.json(
      { 
        error: 'Error generating PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
        useClientFallback: true,
      },
      { status: 500 }
    );
  }
}
