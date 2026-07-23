import { ImageResponse } from "next/og";

// Ícone do app gerado como PNG (usado no manifest e como apple-touch-icon):
// S-Pulse branco sobre o gradiente Aurora, full-bleed para funcionar como maskable.
export const contentType = "image/png";
export const size = { width: 512, height: 512 };

const SPULSE = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='8.5 -8 120 120' width='300' height='300'>" +
    "<path d='M 88 30 C 86 14 60 10 45 18 C 28 27 30 44 48 50 L 54 52 L 60 38 L 68 64 L 74 52 L 80 54 C 94 60 96 80 80 92 C 62 102 38 98 32 84' fill='none' stroke='white' stroke-width='11' stroke-linecap='round' stroke-linejoin='round'/>" +
    "<circle cx='98' cy='20' r='7' fill='white'/>" +
    "</svg>",
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
          background: "linear-gradient(135deg, #0B6EF5 0%, #00C9A7 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPULSE} width={300} height={300} alt="" />
      </div>
    ),
    size,
  );
}
