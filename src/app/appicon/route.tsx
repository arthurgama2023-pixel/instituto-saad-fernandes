import { ImageResponse } from "next/og";

// Ícone do app gerado como PNG (usado no manifest e como apple-touch-icon):
// a logo "A Consulta" — balão de conversa com o pulso — em verde vivo sobre o
// marinho, exatamente como a marca escolhida. Full-bleed / maskable.
export const contentType = "image/png";
export const size = { width: 512, height: 512 };

const BUBBLE = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='330' height='330'>" +
    "<g fill='none' stroke='#3fce3c' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M30,18 H70 a14,14 0 0 1 14,14 V56 a14,14 0 0 1 -14,14 H46 l-10,13 -2,-13 h-4 a14,14 0 0 1 -14,-14 V32 a14,14 0 0 1 14,-14 Z'/>" +
    "<path d='M26,45 H40 L45,34 L54,59 L60,41 L64,45 H74'/>" +
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
