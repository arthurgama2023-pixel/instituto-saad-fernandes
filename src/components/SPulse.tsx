export function SPulse({ color = "#fff" }: { color?: string }) {
  return (
    <svg viewBox="8.5 -8 120 120" aria-hidden="true">
      <path
        d="M 88 30 C 86 14 60 10 45 18 C 28 27 30 44 48 50 L 54 52 L 60 38 L 68 64 L 74 52 L 80 54 C 94 60 96 80 80 92 C 62 102 38 98 32 84"
        fill="none"
        stroke={color}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="98" cy="20" r="7" fill={color} />
    </svg>
  );
}
