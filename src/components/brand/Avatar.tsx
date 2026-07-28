import { initials } from "@/lib/patient-data";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-label-lg font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </div>
  );
}
