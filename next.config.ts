import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Datei-Uploads (Bibliothek) brauchen mehr als das 1-MB-Default
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
