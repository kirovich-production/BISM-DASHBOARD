/**
 * Helper para llamadas a Browserless.io API
 * Centraliza la configuración y manejo de errores para generación de PDF
 */

const BROWSERLESS_URL = 'https://production-sfo.browserless.io/pdf';

export interface BrowserlessPdfOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  preferCSSPageSize?: boolean;
  scale?: number;
  width?: number;
  height?: number;
  timeout?: number;
}

export interface BrowserlessResponse {
  success: boolean;
  pdfBuffer?: ArrayBuffer;
  error?: string;
  useClientFallback?: boolean;
}

const DEFAULT_OPTIONS: BrowserlessPdfOptions = {
  format: 'A4',
  landscape: true,
  printBackground: true,
  margin: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
  },
  displayHeaderFooter: false,
  preferCSSPageSize: true,
  scale: 1.0,
  timeout: 30000,
};

/**
 * Obtiene el token de Browserless desde las variables de entorno
 */
export function getBrowserlessToken(): string | undefined {
  return process.env.BROWSERLESS_API_TOKEN;
}

/**
 * Verifica si Browserless está configurado
 */
export function isBrowserlessConfigured(): boolean {
  return !!getBrowserlessToken();
}

/**
 * Genera un PDF usando Browserless.io API
 * @param html - Contenido HTML para convertir a PDF
 * @param options - Opciones de configuración del PDF (opcional)
 * @returns Objeto con el buffer del PDF o información del error
 */
export async function generatePdfWithBrowserless(
  html: string,
  options?: Partial<BrowserlessPdfOptions>
): Promise<BrowserlessResponse> {
  const token = getBrowserlessToken();
  
  if (!token) {
    console.error('❌ BROWSERLESS_API_TOKEN no configurado');
    return {
      success: false,
      error: 'Browserless token not configured',
      useClientFallback: true,
    };
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const url = `${BROWSERLESS_URL}?token=${token}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        html,
        options: mergedOptions,
        viewport: {
          width: mergedOptions.width || 1920,
          height: mergedOptions.height || 1080,
          isMobile: false,
          hasTouch: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Browserless error:', response.status, errorText);
      return {
        success: false,
        error: `Browserless error: ${response.status} - ${errorText}`,
        useClientFallback: true,
      };
    }

    const pdfBuffer = await response.arrayBuffer();
    return {
      success: true,
      pdfBuffer,
    };
  } catch (error) {
    console.error('❌ Error en llamada a Browserless:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      useClientFallback: true,
    };
  }
}

/**
 * Genera un PDF con configuración optimizada para alta calidad
 */
export async function generateHighQualityPdf(
  html: string,
  options?: Partial<BrowserlessPdfOptions>
): Promise<BrowserlessResponse> {
  return generatePdfWithBrowserless(html, {
    scale: 1.0,
    width: 1920,
    height: 1080,
    margin: {
      top: '0.2in',
      right: '0.2in',
      bottom: '0.2in',
      left: '0.2in',
    },
    ...options,
  });
}
