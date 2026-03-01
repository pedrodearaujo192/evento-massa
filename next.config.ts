import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone é obrigatório para App Hosting
  output: 'standalone',

  // Garante que o SDK do Mercado Pago seja processado corretamente pelo servidor
  transpilePackages: ['mercadopago'],

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/**" },
      { protocol: "https", hostname: "api.qrserver.com", pathname: "/**" },
      { protocol: "https", hostname: "layrse-eventos.web.app", pathname: "/**" },
      { protocol: "https", hostname: "layrse-eventos.firebaseapp.com", pathname: "/**" },
    ],
  },

  trailingSlash: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
