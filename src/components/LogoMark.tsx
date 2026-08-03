import { Logo } from "@/components/Logo";

// A logo no seu "tile" — o balão+pulso verde sobre um quadrado claro de cantos
// arredondados, como o asset de referência da marca. É esta a forma que aparece
// na sidebar, no portal e na Clara; centralizada aqui para que todos os lugares
// fiquem idênticos (antes cada um montava o próprio tile, com fundo diferente).
//
// Estilos inline de propósito: o componente é usado tanto nas telas .brand-app
// (Tailwind) quanto na Clara (CSS Pulse), então não pode depender de nenhuma das
// duas camadas.

const TILE_BG = "#edeffb"; // lavanda muito claro, o fundo da logo de referência
const ICON = "#3fce3c"; // verde vivo da marca, o mesmo do ícone do app

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: TILE_BG,
        // hairline para o tile se destacar quando o fundo da página também é claro
        boxShadow: "inset 0 0 0 1px rgba(16, 24, 40, 0.06)",
      }}
    >
      <Logo color={ICON} size={Math.round(size * 0.62)} />
    </span>
  );
}
