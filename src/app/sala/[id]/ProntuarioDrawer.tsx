"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/brand/Icon";

type SaveState = "idle" | "digitando" | "salvando" | "salvo" | "erro";

const AUTOSAVE_DELAY_MS = 1500;

/**
 * Painel do prontuário aberto durante a videochamada (só pro médico). Fica
 * como drawer sobre o vídeo — a consulta continua rodando atrás. Salva
 * sozinho (debounce) enquanto o médico digita, sem exigir clique.
 */
export function ProntuarioDrawer({
  appointmentId,
  doctorId,
  aberto,
  onClose,
}: {
  appointmentId: string;
  doctorId: string;
  aberto: boolean;
  onClose: () => void;
}) {
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState("");
  const [condutas, setCondutas] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carregouRef = useRef(false);

  // Carrega o prontuário existente da consulta na primeira abertura.
  useEffect(() => {
    if (!aberto || carregouRef.current) return;
    carregouRef.current = true;
    fetch(`/api/medico/prontuario?appointmentId=${appointmentId}&doctorId=${doctorId}`)
      .then((r) => r.json())
      .then((d) => {
        setResumo(d.resumoClinico ?? "");
        setCondutas(d.condutas ?? "");
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [aberto, appointmentId, doctorId]);

  const salvar = async (novoResumo: string, novasCondutas: string) => {
    setSaveState("salvando");
    try {
      const r = await fetch("/api/medico/prontuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, doctorId, resumoClinico: novoResumo, condutas: novasCondutas }),
      });
      setSaveState(r.ok ? "salvo" : "erro");
    } catch {
      setSaveState("erro");
    }
  };

  // Autosave com debounce: reagenda a cada tecla, salva 1.5s depois de parar.
  const agendarSalvamento = (novoResumo: string, novasCondutas: string) => {
    setSaveState("digitando");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => salvar(novoResumo, novasCondutas), AUTOSAVE_DELAY_MS);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const statusLabel: Record<SaveState, string> = {
    idle: "",
    digitando: "Digitando…",
    salvando: "Salvando…",
    salvo: "Salvo",
    erro: "Não foi possível salvar",
  };
  const statusIcon: Record<SaveState, string | null> = {
    idle: null,
    digitando: "edit",
    salvando: "sync",
    salvo: "check_circle",
    erro: "error",
  };

  return (
    <>
      {/* Backdrop leve — clicar fora fecha, mas não pausa a chamada */}
      {aberto && <div className="absolute inset-0 bg-black/30 z-20" onClick={onClose} />}

      <aside
        className={`absolute top-0 right-0 h-full w-full sm:w-[420px] bg-[#0f1e2e] z-30 shadow-2xl transition-transform duration-200 flex flex-col ${
          aberto ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white text-headline-sm font-headline-sm">Prontuário</h2>
            <p className="text-white/50 text-body-sm font-body-sm">Preencha durante a consulta — salva sozinho.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar prontuário" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
            <Icon name="close" />
          </button>
        </div>

        {carregando ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div className="space-y-2">
              <label htmlFor="drawer-resumo" className="text-white text-label-lg font-label-lg">Resumo clínico</label>
              <textarea
                id="drawer-resumo"
                value={resumo}
                onChange={(e) => {
                  setResumo(e.target.value);
                  agendarSalvamento(e.target.value, condutas);
                }}
                placeholder="Queixa, histórico, exame, hipótese diagnóstica…"
                maxLength={4000}
                className="w-full min-h-[120px] p-4 rounded-xl bg-white/5 border border-white/15 text-body-md font-body-md text-white placeholder:text-white/30 resize-y focus:border-white/40 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="drawer-condutas" className="text-white text-label-lg font-label-lg">Condutas &amp; recomendações</label>
              <textarea
                id="drawer-condutas"
                value={condutas}
                onChange={(e) => {
                  setCondutas(e.target.value);
                  agendarSalvamento(resumo, e.target.value);
                }}
                placeholder="Prescrição, exames solicitados, orientações, retorno…"
                maxLength={4000}
                className="w-full min-h-[120px] p-4 rounded-xl bg-white/5 border border-white/15 text-body-md font-body-md text-white placeholder:text-white/30 resize-y focus:border-white/40 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-t border-white/10 shrink-0 flex items-center gap-2 text-body-sm font-body-sm text-white/60 min-h-[44px]">
          {statusIcon[saveState] && (
            <Icon
              name={statusIcon[saveState]!}
              size={16}
              className={saveState === "salvando" ? "animate-spin" : saveState === "erro" ? "text-error" : "text-[#3fce3c]"}
            />
          )}
          {statusLabel[saveState]}
        </div>
      </aside>
    </>
  );
}
