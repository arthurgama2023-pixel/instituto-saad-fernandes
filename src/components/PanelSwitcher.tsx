"use client";

import { useRouter } from "next/navigation";

export function DoctorSwitcher({
  doctors,
  current,
  tab,
}: {
  doctors: { id: string; name: string; specialty: string }[];
  current: string;
  tab: string;
}) {
  const router = useRouter();
  return (
    <div className="switcher">
      <span style={{ fontSize: 12.5, color: "var(--text-3)", fontWeight: 600 }}>Ver como:</span>
      <select
        value={current}
        onChange={(e) => router.push(`/medico?d=${e.target.value}&tab=${tab}`)}
      >
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>
        ))}
      </select>
    </div>
  );
}
