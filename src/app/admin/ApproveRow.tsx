"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const initials = (n: string) =>
  n.replace(/^(dra?\.?)\s+/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function ApproveRow({ id, name, sub }: { id: string; name: string; sub: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"ACTIVE" | "SUSPENDED" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  async function decidir(status: "ACTIVE" | "SUSPENDED") {
    setLoading(status);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/medicos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setFeito(true);
      router.refresh();
    } catch {
      setErro("Não consegui salvar. Tenta de novo.");
    } finally {
      setLoading(null);
    }
  }

  if (feito) return null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-outline-variant/40 last:border-0">
      <span className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-label-md font-label-md shrink-0">
        {initials(name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-label-lg font-label-lg text-primary truncate">{name}</div>
        <div className="text-body-sm font-body-sm text-on-surface-variant truncate">{sub}</div>
        {erro && <div className="text-body-sm font-body-sm text-error">{erro}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => decidir("ACTIVE")}
          disabled={loading !== null}
          className="sd-aurora h-9 px-4 rounded-full text-label-md font-label-md active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading === "ACTIVE" ? "Aprovando…" : "Aprovar"}
        </button>
        <button
          onClick={() => decidir("SUSPENDED")}
          disabled={loading !== null}
          className="h-9 px-4 rounded-full border border-error/60 text-error text-label-md font-label-md hover:bg-error-container/40 transition-colors disabled:opacity-50"
        >
          {loading === "SUSPENDED" ? "Recusando…" : "Recusar"}
        </button>
      </div>
    </div>
  );
}
