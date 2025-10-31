import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración para Puppeteer
  serverExternalPackages: ['puppeteer', 'puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;
