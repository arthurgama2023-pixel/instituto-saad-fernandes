"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/brand/Icon";

type Chamado = {
  id: string;
  paciente: string;
  especialidade: string;
  descricao: string;
  criadoEm: string;
  expiraEm: string;
};

const POLL_MS = 3000;

const esperando = (criadoEm: string) => {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(criadoEm).getTime()) / 1000));
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
};

/**
 * Fila de chamados de urgência do médico, na identidade Smart Doctor (brand-app).
 * Embutido no dashboard, fica invisível sem chamado (não quer virar ruído ali).
 * Como aba própria (`standalone`), mostra um estado vazio em vez de sumir.
 */
export function UrgencyInbox({ doctorId, standalone = false }: { doctorId: string; standalone?: boolean }) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [aceitando, setAceitando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [, forcarTick] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/medico/urgencias?medicoId=${encodeURIComponent(doctorId)}`);
      if (!r.ok) return;
      const d = await r.json();
      setChamados(d.chamados);
    } catch {
      /* rede caiu: a próxima rodada do polling tenta de novo */
    }
  }, [doctorId]);

  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  useEffect(() => {
    carregarRef.current();
    const poll = setInterval(() => carregarRef.current(), POLL_MS);
    const relogio = setInterval(() => forcarTick((n) => n + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(relogio);
    };
  }, [doctorId]);

  const aceitar = async (chamadoId: string) => {
    setAceitando(chamadoId);
    setAviso(null);
    try {
      const r = await fetch("/api/medico/urgencias/aceitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chamadoId, medicoId: doctorId }),
      });
      if (r.status === 409) {
        setAviso("Outro médico aceitou esse chamado primeiro.");
      } else if (!r.ok) {
        setAviso("Não consegui aceitar o chamado. Tente de novo.");
      } else {
        setAviso("Chamado aceito. O paciente está confirmando o pagamento.");
      }
      await carregar();
    } catch {
      setAviso("Não consegui aceitar o chamado. Tente de novo.");
    } finally {
      setAceitando(null);
    }
  };

  if (chamados.length === 0 && !aviso) {
    if (!standalone) return null;
    return (
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest flex flex-col items-center gap-2 py-12 text-center brand-shadow">
        <Icon name="emergency" className="text-on-tertiary-container" size={32} />
        <p className="text-body-md font-body-md text-on-surface-variant">Nenhum chamado de urgência no momento.</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Assim que um paciente da sua especialidade pedir urgência, aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-error/40 bg-error-container/40 p-5 brand-shadow">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="flex items-center gap-2 text-headline-sm font-headline-sm text-primary">
          <Icon name="emergency" filled className="text-error" size={22} /> Chamados de urgência
        </h3>
        {chamados.length > 0 && (
          <span className="text-body-sm font-body-sm text-on-surface-variant">{chamados.length} aguardando</span>
        )}
      </div>

      {aviso && (
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-3" role="status">
          {aviso}
        </p>
      )}

      <div className="space-y-3">
        {chamados.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-4 rounded-lg bg-surface-container-lowest border border-outline-variant/40 p-4"
          >
            <div className="flex-1 min-w-0">
              <div className="text-label-lg font-label-lg text-primary">{c.paciente}</div>
              <div className="text-body-sm font-body-sm text-on-surface-variant mb-1">
                {c.especialidade} · esperando há {esperando(c.criadoEm)}
              </div>
              <div className="text-body-md font-body-md text-on-surface">{c.descricao || "(sem descrição)"}</div>
            </div>
            <button
              className="sd-aurora h-10 px-5 rounded-full text-label-md font-label-md active:scale-95 transition-transform disabled:opacity-40 shrink-0"
              onClick={() => aceitar(c.id)}
              disabled={aceitando !== null}
            >
              {aceitando === c.id ? "Aceitando…" : "Aceitar"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
