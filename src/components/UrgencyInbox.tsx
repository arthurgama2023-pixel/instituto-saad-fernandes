"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * Fila de chamados de urgência do médico. Vive no painel antigo (Pulse), então
 * usa as classes de lá — o rebrand do painel do médico é uma etapa à parte.
 */
export function UrgencyInbox({ doctorId }: { doctorId: string }) {
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

  if (chamados.length === 0 && !aviso) return null;

  return (
    <div className="block" style={{ borderColor: "rgba(240, 68, 56, 0.5)" }}>
      <h3>
        🚨 Chamados de urgência <span className="count">{chamados.length} aguardando</span>
      </h3>

      {aviso && (
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 10px" }} role="status">
          {aviso}
        </p>
      )}

      {chamados.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "12px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.paciente}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", margin: "2px 0 4px" }}>
              {c.especialidade} · esperando há {esperando(c.criadoEm)}
            </div>
            <div style={{ fontSize: 13 }}>{c.descricao || "(sem descrição)"}</div>
          </div>
          <button
            className="btn-sm primary"
            onClick={() => aceitar(c.id)}
            disabled={aceitando !== null}
            style={{ flexShrink: 0 }}
          >
            {aceitando === c.id ? "Aceitando…" : "Aceitar"}
          </button>
        </div>
      ))}
    </div>
  );
}
