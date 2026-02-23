import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone' é recomendado para App Hosting e ambientes serverless
  output: 'standalone',

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
