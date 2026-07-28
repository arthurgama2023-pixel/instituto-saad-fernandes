import type { MetadataRoute } from "next";

// Web App Manifest (Next serve em /manifest.webmanifest) — torna o app
// instalável na tela inicial, abrindo em modo standalone (sem barra do navegador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Instituto Saad Fernandes",
    short_name: "Saad Fernandes",
    description: "Cuidado médico exclusivo em tricologia, dermatologia e clínica geral.",
    start_url: "/paciente",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F9F9FF",
    theme_color: "#0c1c31",
    icons: [
      { src: "/appicon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/appicon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/appicon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
