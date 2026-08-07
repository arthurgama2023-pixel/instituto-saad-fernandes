"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { usePatient } from "@/lib/patient-data";
import { ProntuarioDrawer } from "./ProntuarioDrawer";

// Servidor Jitsi público — grátis, sem conta/token. Trocável por um Jitsi
// self-hosted no futuro mudando só esta constante.
const JITSI_DOMAIN = "meet.jit.si";

type CallState = "conectando" | "ativa" | "erro";

// O External API do Jitsi expõe uma classe global depois que o script carrega.
// Sem @types p/ ela, então tipamos como unknown/any localmente.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI?: any;
  }
}

/** Carrega o external_api.js do Jitsi uma única vez. */
function loadJitsiScript(domain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const existing = document.getElementById("jitsi-external-api");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("falha ao carregar Jitsi")));
      return;
    }
    const s = document.createElement("script");
    s.id = "jitsi-external-api";
    s.src = `https://${domain}/external_api.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("falha ao carregar Jitsi"));
    document.body.appendChild(s);
  });
}

export default function SalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const { data } = usePatient();

  // Perspectiva: por padrão é o paciente (entra pela consulta e vê o médico).
  // O médico entra pelo painel com ?como=medico&d=<id do médico>.
  const comoMedico = search.get("como") === "medico";
  const doctorId = search.get("d");

  // Para onde a pessoa vai ao encerrar. O médico volta ao próprio painel (mesmo
  // médico do "Ver como", se veio com ?d=); o paciente vai para a tela da consulta.
  const destinoSaida = comoMedico
    ? `/medico${doctorId ? `?d=${doctorId}&tab=dashboard` : ""}`
    : `/paciente/consultas/${id}`;

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const [callState, setCallState] = useState<CallState>("conectando");
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [encerrada, setEncerrada] = useState(false);
  // Entrou de fato na conferência (evento do Jitsi) — dispara o cronômetro.
  // Separado de callState: o iframe do Jitsi já fica VISÍVEL antes disso, pra
  // mostrar a própria tela dele (permissão de câmera, "entrar na sala" etc.).
  const [entrou, setEntrou] = useState(false);
  const [prontuarioAberto, setProntuarioAberto] = useState(false);

  const appt = data ? [...data.upcoming, ...data.past].find((a) => a.id === id) : undefined;
  const remotoSub = comoMedico ? "Paciente" : (appt?.especialidade ?? "Consulta");

  // Conecta na sala Jitsi: pede o acesso ao servidor (que valida a janela de
  // horário) e embute o iframe do Jitsi Meet.
  useEffect(() => {
    let cancelado = false;

    async function conectar() {
      if (!containerRef.current) return;
      try {
        const res = await fetch(`/api/sala/${id}/acesso`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ como: comoMedico ? "medico" : "paciente", doctorId: doctorId ?? undefined }),
        });
        if (cancelado) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErroMsg(
            body.error === "outside_window"
              ? "A sala só abre 10 minutos antes do horário da consulta."
              : "Não foi possível entrar na sala.",
          );
          setCallState("erro");
          return;
        }
        const { roomName, userName } = (await res.json()) as { roomName: string; userName: string };

        await loadJitsiScript(JITSI_DOMAIN);
        if (cancelado || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: userName },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
          },
        });
        apiRef.current = api;
        // Revela o iframe do Jitsi já — a UI dele (permissão de câmera, botão
        // de entrar, "aguardando moderador") precisa ficar visível pro usuário.
        if (!cancelado) setCallState("ativa");
        api.addEventListener("videoConferenceJoined", () => {
          if (!cancelado) setEntrou(true);
        });
        api.addEventListener("readyToClose", () => setEncerrada(true));
        api.addEventListener("videoConferenceLeft", () => setEncerrada(true));
      } catch {
        if (!cancelado) {
          setErroMsg("Não foi possível entrar na sala.");
          setCallState("erro");
        }
      }
    }

    conectar();
    return () => {
      cancelado = true;
      apiRef.current?.dispose?.();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Cronômetro da consulta — só corre depois de entrar de fato na conferência.
  useEffect(() => {
    if (encerrada || !entrou) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [encerrada, entrou]);

  const cronometro = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  if (encerrada) {
    return (
      <main className="fixed inset-0 bg-[#0a1420] flex flex-col items-center justify-center text-center px-8 gap-4">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="call_end" className="text-white" size={40} />
        </div>
        <h1 className="text-headline-md font-headline-md text-white">Consulta encerrada</h1>
        <p className="text-body-md font-body-md text-white/60">Duração: {cronometro}</p>
        <button
          onClick={() => router.push(destinoSaida)}
          className="mt-4 h-12 px-6 bg-white text-[#0a1420] rounded-xl text-label-lg font-label-lg"
        >
          {comoMedico ? "VOLTAR AO PAINEL" : "VOLTAR À CONSULTA"}
        </button>
      </main>
    );
  }

  if (callState === "erro") {
    return (
      <main className="fixed inset-0 bg-[#0a1420] flex flex-col items-center justify-center text-center px-8 gap-4">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="videocam_off" className="text-white" size={40} />
        </div>
        <h1 className="text-headline-md font-headline-md text-white">Não deu para entrar na sala</h1>
        <p className="text-body-md font-body-md text-white/60">{erroMsg}</p>
        <button
          onClick={() => router.push(destinoSaida)}
          className="mt-4 h-12 px-6 bg-white text-[#0a1420] rounded-xl text-label-lg font-label-lg"
        >
          VOLTAR
        </button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-[#0a1420] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      {callState === "conectando" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a1420] pointer-events-none">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-body-md font-body-md">Entrando na sala…</p>
        </div>
      )}

      {entrou && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 pointer-events-none z-10">
          <span className="w-2 h-2 rounded-full bg-[#3fce3c] animate-pulse" />
          <span className="text-white text-body-sm font-body-sm">
            Consulta em andamento · {cronometro} · {remotoSub}
          </span>
        </div>
      )}

      {comoMedico && callState === "ativa" && doctorId && !prontuarioAberto && (
        <button
          onClick={() => setProntuarioAberto(true)}
          aria-label="Abrir prontuário"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 px-3 py-3 rounded-2xl bg-black/40 text-white active:scale-95 transition-transform"
        >
          <Icon name="clinical_notes" size={22} />
          <span className="text-[10px] font-label-md">Prontuário</span>
        </button>
      )}

      {comoMedico && doctorId && (
        <ProntuarioDrawer
          appointmentId={id}
          doctorId={doctorId}
          aberto={prontuarioAberto}
          onClose={() => setProntuarioAberto(false)}
        />
      )}
    </main>
  );
}
