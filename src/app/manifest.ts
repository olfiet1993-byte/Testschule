import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Test Schule – Lernraum",
    short_name: "Test Schule",
    description: "Lernplattform für die Pflegeausbildung",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0ea5e9",
    orientation: "portrait",
    icons: [
      // Wird automatisch durch icon.tsx + apple-icon.tsx befüllt — Next.js fügt sie ein.
      // Diese Einträge sind Fallback / explizite Größen für PWA-Installer.
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    categories: ["education"],
  };
}
