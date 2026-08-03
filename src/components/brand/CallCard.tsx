"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { downloadIcs } from "@/lib/calendar";

// Janela em que o botão "Entrar na sala" fica liberado: de 10 min antes até o fim.
const JOIN_ANTES_MS = 10 * 60 * 1000;

export type CallInfo = {
  id: string;
  startsAt: string;
  medico: string;
  especialidade: string;
  mode: string;
  durationMin?: number;
};

// "faltam 2d 3h" / "faltam 3h 12min" / "faltam 8min" / "faltam 40s"
function faltam(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (d >= 1) return `faltam ${d}d ${h}h`;
  if (h >= 1) return `faltam ${h}h ${m}min`;
  if (m >= 1) return `faltam ${m}min`;
  return `faltam ${seg}s`;
}

export function CallCard({ call }: { call: CallInfo }) {
  // now começa nulo para não divergir entre servidor e cliente (hidratação); o
  // relógio só liga no navegador.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startMs = new Date(call.startsAt).getTime();
  const dur = call.durationMin ?? 30;
  const endMs = startMs + dur * 60000;
  const isVideo = call.mode === "VIDEO";

  const encerrada = now !== null && now > endMs;
  const liberada = now !== null && isVideo && now >= startMs - JOIN_ANTES_MS && now <= endMs;
  const faltamTxt = now !== null ? faltam(startMs - now) : null;

  const adicionarAgenda = () => {
    const roomUrl = typeof window !== "undefined" ? `${window.location.origin}/sala/${call.id}` : "";
    downloadIcs({
      id: call.id,
      title: `Consulta de ${call.especialidade} com ${call.medico}`,
      startsAt: call.startsAt,
      durationMin: dur,
      description: isVideo
        ? `Teleconsulta Smart Doctor.\nEntre pela sala: ${roomUrl}`
        : "Consulta Smart Doctor.",
      location: isVideo ? roomUrl : "Consulta presencial",
    });
  };

  return (
    <section className="rounded-xl border border-secondary-fixed/40 bg-secondary-container/40 p-5 brand-shadow">
      <div className="flex items-center gap-2 text-secondary mb-3">
        <Icon name={isVideo ? "videocam" : "event"} filled size={20} />
        <span className="text-label-md font-label-md uppercase tracking-wider">
          {isVideo ? "Sua chamada agendada" : "Sua consulta agendada"}
        </span>
      </div>

      <p className="text-headline-sm font-headline-sm text-primary">Consulta de {call.especialidade}</p>
      <p className="text-body-md font-body-md text-on-surface-variant mt-0.5">{call.medico}</p>

      <div className="flex items-center gap-2 mt-3 text-on-surface">
        <Icon name="schedule" size={18} className="text-secondary" />
        <span className="text-body-md font-body-md" suppressHydrationWarning>
          {encerrada
            ? "Consulta encerrada"
            : liberada
              ? "A sala já está aberta"
              : faltamTxt ?? "—"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-5">
        {isVideo && !encerrada && (
          liberada ? (
            <Link
              href={`/sala/${call.id}`}
              className="sd-aurora flex-1 h-12 rounded-xl text-label-lg font-label-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
            >
              <Icon name="videocam" filled size={20} /> Entrar na sala
            </Link>
          ) : (
            <span
              className="flex-1 h-12 rounded-xl bg-surface-container text-on-surface-variant text-label-lg font-label-lg flex items-center justify-center gap-2 cursor-default"
              title="A sala abre 10 minutos antes do horário"
            >
              <Icon name="lock_clock" size={20} /> Disponível 10 min antes
            </span>
          )
        )}
        <button
          onClick={adicionarAgenda}
          className="flex-1 h-12 rounded-xl border border-outline-variant/70 text-primary text-label-lg font-label-lg flex items-center justify-center gap-2 hover:border-secondary transition-colors active:scale-95"
        >
          <Icon name="calendar_add_on" size={20} /> Adicionar à agenda
        </button>
      </div>
    </section>
  );
}
