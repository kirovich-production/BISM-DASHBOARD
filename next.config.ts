import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desactivar React Strict Mode para evitar doble render en producción
  reactStrictMode: false,
};

export default nextConfig;
