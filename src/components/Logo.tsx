// A logo do Smart Doctor: o balão de conversa com o pulso ("A Consulta"), que foi
// a marca escolhida pelo cliente. Este arquivo é a ÚNICA fonte do desenho — o
// traçado vivia copiado em três lugares (login do médico, ícone do app e um SVG
// solto em public/), e os painéis ainda mostravam um "S" de uma marca anterior.
//
// A rota /appicon importa LOGO_PATHS daqui para montar o PNG, então mexer no
// desenho aqui atualiza o ícone do app junto.

/** Balão + linha de pulso. viewBox recortado no conteúdo, sem margem morta. */
export const LOGO_VIEWBOX = "12 12 76 76";
export const LOGO_PATHS = [
  "M30,18 H70 a14,14 0 0 1 14,14 V56 a14,14 0 0 1 -14,14 H46 l-10,13 -2,-13 h-4 a14,14 0 0 1 -14,-14 V32 a14,14 0 0 1 14,-14 Z",
  "M26,45 H40 L45,34 L54,59 L60,41 L64,45 H74",
];

export function Logo({ color = "#fff", size }: { color?: string; size?: number }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      aria-hidden="true"
      // O traço engorda de leve porque a marca aparece a 21px na sidebar, onde um
      // stroke fino some contra o gradiente.
      style={{ display: "block" }}
    >
      <g fill="none" stroke={color} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
        {LOGO_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
