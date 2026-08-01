import type { MetadataRoute } from "next";

// Web App Manifest (Next serve em /manifest.webmanifest) — torna o app
// instalável na tela inicial, abrindo em modo standalone (sem barra do navegador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Doctor",
    short_name: "Smart Doctor",
    description: "Telemedicina com inteligência que cuida. Seu médico a uma mensagem de distância.",
    start_url: "/paciente",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1420",
    theme_color: "#0a1420",
    icons: [
      { src: "/appicon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/appicon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/appicon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
