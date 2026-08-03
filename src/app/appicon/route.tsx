import { ImageResponse } from "next/og";
import { LOGO_PATHS, LOGO_VIEWBOX } from "@/components/Logo";

// Ícone do app gerado como PNG (usado no manifest e como apple-touch-icon):
// a logo "A Consulta" — balão de conversa com o pulso — em verde vivo sobre o
// marinho, exatamente como a marca escolhida. Full-bleed / maskable.
//
// O satori (motor do next/og) não renderiza <path>, só imagens: por isso o SVG é
// montado como data URI em vez de JSX. O desenho vem do componente Logo, para o
// ícone não sair do lugar quando a marca mudar.
export const contentType = "image/png";
export const size = { width: 512, height: 512 };

const BUBBLE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${LOGO_VIEWBOX}' width='330' height='330'>` +
    "<g fill='none' stroke='#3fce3c' stroke-width='6.5' stroke-linecap='round' stroke-linejoin='round'>" +
    LOGO_PATHS.map((d) => `<path d='${d}'/>`).join("") +
    "</g></svg>",
)}`;

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1420",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BUBBLE} width={340} height={340} alt="" />
      </div>
    ),
    size,
  );
}
