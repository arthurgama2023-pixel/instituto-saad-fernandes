import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "pg",
    "nodemailer",
    "node-forge",
    // pdf-lib externo junto do @signpdf: senão o Turbopack empacota uma cópia
    // do pdf-lib pro nosso código e o @signpdf usa outra — o placeholder some
    // (duas instâncias, o doc não é o mesmo) e a assinatura falha ("No ByteRange").
    "pdf-lib",
    "@signpdf/signpdf",
    "@signpdf/signer-p12",
    "@signpdf/placeholder-pdf-lib",
  ],
  turbopack: { root: __dirname },
  // Esconde o badge "N" de dev do Next (canto inferior esquerdo) que tapava o
  // botão Início da bottom nav no celular. É só do modo dev — não existe em produção.
  devIndicators: false,
  // Next 16 bloqueia recursos de dev vindos de hosts != localhost (quebra a
  // hidratação ao abrir pelo IP no celular). Liberamos o IP atual + faixas
  // privadas comuns para o app funcionar na rede local independente do Wi-Fi.
  allowedDevOrigins: [
    "10.10.220.234",
    "10.10.220.*",
    "172.20.10.*",
    "172.19.64.*",
    "192.168.0.*",
    "192.168.1.*",
    "192.168.15.*",
    // Túnel Cloudflare (HTTPS) p/ testar videochamada no celular — o subdomínio
    // muda a cada quick tunnel, então liberamos o domínio inteiro.
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
