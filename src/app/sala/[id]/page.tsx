"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { initials, timeLabel, usePatient } from "@/lib/patient-data";

type CamState = "ligando" | "on" | "off" | "bloqueada";

export default function SalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data } = usePatient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<CamState>("ligando");
  const [micOn, setMicOn] = useState(true);
  const [segundos, setSegundos] = useState(0);
  const [encerrada, setEncerrada] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);

  const appt = data ? [...data.upcoming, ...data.past].find((a) => a.id === id) : undefined;
  const medico = appt?.medico ?? "Seu médico";
  const especialidade = appt?.especialidade ?? "Consulta";

  // Câmera local (autovisualização). Não é uma chamada real — é o seu próprio
  // vídeo no navegador. Só funciona em HTTPS ou localhost; no celular por HTTP
  // cai no placeholder (bloqueada).
  useEffect(() => {
    let cancelado = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("bloqueada");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamState("on");
      })
      .catch(() => setCamState("bloqueada"));
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Cronômetro da consulta.
  useEffect(() => {
    if (encerrada) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [encerrada]);

  const toggleCam = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (camState === "on") {
      if (track) track.enabled = false;
      setCamState("off");
    } else if (camState === "off") {
      if (track) track.enabled = true;
      setCamState("on");
    }
  }, [camState]);

  const encerrar = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setEncerrada(true);
  };

  const cronometro = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  if (encerrada) {
    return (
      <main className="fixed inset-0 bg-[#0a1420] flex flex-col items-center justify-center text-center px-8 gap-4">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="call_end" className="text-white" size={40} />
        </div>
        <h1 className="text-headline-md font-headline-md text-white">Consulta encerrada</h1>
        <p className="text-body-md font-body-md text-white/60">
          Duração: {cronometro} · {medico}
        </p>
        <button
          onClick={() => router.push(`/paciente/consultas/${id}`)}
          className="mt-4 h-12 px-6 bg-white text-[#0a1420] rounded-xl text-label-lg font-label-lg"
        >
          VOLTAR À CONSULTA
        </button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-[#0a1420] overflow-hidden select-none">
      {/* "Vídeo" do médico ocupando a tela (placeholder — sem chamada real) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
        <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center text-white text-[40px] font-bold">
          {initials(medico)}
        </div>
        <div className="text-center">
          <p className="text-white text-headline-sm font-headline-sm">{medico}</p>
          <p className="text-white/50 text-body-sm font-body-sm">{especialidade}</p>
        </div>
      </div>

      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5">
        <button onClick={encerrar} aria-label="Minimizar" className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white">
          <Icon name="expand_more" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30">
          <span className="w-2 h-2 rounded-full bg-[#3fce3c] animate-pulse" />
          <span className="text-white text-body-sm font-body-sm">Consulta em andamento · {cronometro}</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Autovisualização (câmera local ou placeholder) */}
      <div className="absolute right-4 top-20 w-28 h-40 rounded-2xl overflow-hidden bg-black/40 border border-white/15 shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover -scale-x-100 ${camState === "on" ? "" : "hidden"}`}
        />
        {camState !== "on" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-2">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white font-bold">
              {data ? initials(data.name) : "Eu"}
            </div>
            <span className="text-white/60 text-[10px] leading-tight">
              {camState === "ligando" ? "Ligando câmera…" : camState === "off" ? "Câmera desligada" : "Câmera indisponível"}
            </span>
          </div>
        )}
      </div>

      {/* Painel de chat (demo) */}
      {chatAberto && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 bg-[#0f1e2e] rounded-t-3xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-headline-sm font-headline-sm">Chat da consulta</h2>
            <button onClick={() => setChatAberto(false)} aria-label="Fechar chat" className="text-white/60">
              <Icon name="close" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            <div className="max-w-[80%] bg-white/10 text-white rounded-2xl rounded-tl-sm px-4 py-2 text-body-sm">
              Olá! Já estou te vendo. Pode me contar como está se sentindo?
            </div>
            <div className="max-w-[80%] ml-auto bg-[#0aa46e] text-white rounded-2xl rounded-tr-sm px-4 py-2 text-body-sm">
              Oi, doutor(a). Estou com uma coceira no couro cabeludo há uns dias.
            </div>
          </div>
          <div className="flex items-center gap-2 pt-3">
            <div className="flex-1 h-11 px-4 rounded-full bg-white/10 flex items-center text-white/40 text-body-sm">
              Escreva uma mensagem…
            </div>
            <button aria-label="Enviar" className="w-11 h-11 rounded-full bg-[#0aa46e] flex items-center justify-center text-white">
              <Icon name="send" />
            </button>
          </div>
        </div>
      )}

      {/* Barra de controles */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-4 pb-9 pt-6 bg-gradient-to-t from-black/50 to-transparent">
        <ControlBtn icon="chat_bubble" label="Chat" onClick={() => setChatAberto((v) => !v)} active={chatAberto} />
        <ControlBtn icon={micOn ? "mic" : "mic_off"} label="Microfone" onClick={() => setMicOn((v) => !v)} muted={!micOn} />
        <button
          onClick={encerrar}
          aria-label="Encerrar consulta"
          className="w-16 h-16 rounded-full bg-[#e5484d] flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
        >
          <Icon name="call_end" filled size={28} />
        </button>
        <ControlBtn icon={camState === "on" ? "videocam" : "videocam_off"} label="Câmera" onClick={toggleCam} muted={camState !== "on"} />
        <ControlBtn icon="more_horiz" label="Mais" onClick={() => {}} />
      </div>
    </main>
  );
}

function ControlBtn({
  icon,
  label,
  onClick,
  muted,
  active,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  muted?: boolean;
  active?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 w-16">
      <span
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          active ? "bg-white text-[#0a1420]" : muted ? "bg-white/25 text-white" : "bg-white/12 text-white"
        }`}
      >
        <Icon name={icon} size={24} />
      </span>
      <span className="text-white/70 text-[11px]">{label}</span>
    </button>
  );
}
