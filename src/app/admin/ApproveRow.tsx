"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const initials = (n: string) =>
  n.replace(/^(dra?\.?)\s+/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/** Linha da fila de aprovação: aprova (ACTIVE) ou recusa (SUSPENDED) um médico. */
export function ApproveRow({ id, name, sub }: { id: string; name: string; sub: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<"aprovar" | "recusar" | null>(null);
  const [erro, setErro] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const agir = async (acao: "aprovar" | "recusar") => {
    setErro(false);
    setOcupado(acao);
    try {
      const res = await fetch(`/api/admin/medicos/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });
      if (!res.ok) {
        setErro(true);
        return;
      }
      const body = await res.json().catch(() => ({}));
      // Aprovou: mostra o link de ativação (útil enquanto o e-mail não está
      // configurado — o admin pode copiar e mandar ao médico). Segura o refresh
      // até o admin ver o link.
      if (acao === "aprovar" && body.ativacaoLink) {
        setLink(body.ativacaoLink);
      } else {
        router.refresh(); // recusou: some da fila na hora
      }
    } catch {
      setErro(true);
    } finally {
      setOcupado(null);
    }
  };

  if (link) {
    return (
      <div className="py-3 border-b border-outline-variant/40 last:border-0">
        <div className="text-label-lg font-label-lg text-primary">{name} · aprovado ✅</div>
        <div className="text-body-sm font-body-sm text-on-surface-variant mt-1">
          E-mail enviado (se configurado). Link de ativação para criar o acesso:
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 text-body-sm font-body-sm bg-surface-container rounded-lg px-3 py-2 border border-outline-variant/50 text-on-surface"
          />
          <button
            onClick={() => { navigator.clipboard?.writeText(link); }}
            className="h-9 px-3 rounded-full border border-outline-variant/60 text-label-md font-label-md text-primary hover:bg-surface-container-low shrink-0"
          >
            Copiar
          </button>
          <button
            onClick={() => router.refresh()}
            className="h-9 px-3 rounded-full sd-aurora text-label-md font-label-md shrink-0"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-outline-variant/40 last:border-0">
      <span className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-label-md font-label-md shrink-0">
        {initials(name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-label-lg font-label-lg text-primary truncate">{name}</div>
        <div className="text-body-sm font-body-sm text-on-surface-variant truncate">{sub}</div>
        {erro && <div className="text-body-sm font-body-sm text-error">Não deu para concluir. Tente de novo.</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => agir("aprovar")}
          disabled={ocupado !== null}
          className="sd-aurora h-9 px-4 rounded-full text-label-md font-label-md active:scale-95 transition-transform disabled:opacity-50"
        >
          {ocupado === "aprovar" ? "…" : "Aprovar"}
        </button>
        <button
          onClick={() => agir("recusar")}
          disabled={ocupado !== null}
          className="h-9 px-4 rounded-full border border-error/60 text-error text-label-md font-label-md hover:bg-error-container/40 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
        >
          {ocupado === "recusar" ? "…" : "Recusar"}
        </button>
      </div>
    </div>
  );
}
