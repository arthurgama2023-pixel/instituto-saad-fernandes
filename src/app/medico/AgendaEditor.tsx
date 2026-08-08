"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";

type Regra = { weekday: number; startMin: number; endMin: number };

// Ordem brasileira: começa na segunda, domingo por último.
const DIAS: { weekday: number; label: string; curto: string }[] = [
  { weekday: 1, label: "Segunda-feira", curto: "Seg" },
  { weekday: 2, label: "Terça-feira", curto: "Ter" },
  { weekday: 3, label: "Quarta-feira", curto: "Qua" },
  { weekday: 4, label: "Quinta-feira", curto: "Qui" },
  { weekday: 5, label: "Sexta-feira", curto: "Sex" },
  { weekday: 6, label: "Sábado", curto: "Sáb" },
  { weekday: 0, label: "Domingo", curto: "Dom" },
];

const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

type SaveState = "idle" | "salvando" | "salvo" | "erro";

export function AgendaEditor() {
  const [carregando, setCarregando] = useState(true);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [durationMin, setDurationMin] = useState(30);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/medico/agenda")
      .then(async (r) => ({ status: r.status, body: await r.json() }))
      .then(({ status, body }) => {
        if (status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setRegras(body.regras ?? []);
        setDurationMin(body.durationMin ?? 30);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const marcarSujo = () => setSaveState("idle");

  const regrasDoDia = (weekday: number) =>
    regras
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.weekday === weekday)
      .sort((a, b) => a.r.startMin - b.r.startMin);

  const toggleDia = (weekday: number, ligado: boolean) => {
    setErro(null);
    marcarSujo();
    if (ligado) {
      // Liga com uma faixa-padrão 09:00–12:00.
      setRegras((rs) => [...rs, { weekday, startMin: 540, endMin: 720 }]);
    } else {
      setRegras((rs) => rs.filter((r) => r.weekday !== weekday));
    }
  };

  const addFaixa = (weekday: number) => {
    setErro(null);
    marcarSujo();
    setRegras((rs) => [...rs, { weekday, startMin: 780, endMin: 1020 }]); // 13:00–17:00
  };

  const removeFaixa = (index: number) => {
    setErro(null);
    marcarSujo();
    setRegras((rs) => rs.filter((_, i) => i !== index));
  };

  const editarFaixa = (index: number, campo: "startMin" | "endMin", hhmm: string) => {
    setErro(null);
    marcarSujo();
    setRegras((rs) => rs.map((r, i) => (i === index ? { ...r, [campo]: toMin(hhmm) } : r)));
  };

  const salvar = async () => {
    // Validação local espelha a do servidor, pra dar feedback imediato.
    for (const r of regras) {
      if (r.endMin <= r.startMin) {
        setErro("O horário final precisa ser depois do inicial.");
        return;
      }
    }
    for (const dia of DIAS) {
      const doDia = regrasDoDia(dia.weekday).map(({ r }) => r);
      for (let a = 0; a < doDia.length; a++) {
        for (let b = a + 1; b < doDia.length; b++) {
          if (doDia[a].startMin < doDia[b].endMin && doDia[b].startMin < doDia[a].endMin) {
            setErro(`Há faixas sobrepostas em ${dia.label}.`);
            return;
          }
        }
      }
    }

    setSaveState("salvando");
    setErro(null);
    try {
      const r = await fetch("/api/medico/agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regras }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.error ?? "Não consegui salvar a agenda.");
        setSaveState("erro");
        return;
      }
      setSaveState("salvo");
    } catch {
      setErro("Não consegui salvar a agenda. Verifique a conexão.");
      setSaveState("erro");
    }
  };

  if (carregando) return null;

  if (naoAutenticado) {
    return (
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest brand-shadow p-6 flex items-start gap-3">
        <Icon name="lock" size={20} className="text-on-surface-variant mt-0.5" />
        <div>
          <p className="text-label-lg font-label-lg text-primary">Entre como médico</p>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Por segurança, só o médico autenticado edita a própria agenda.{" "}
            <Link href="/medico/login" className="text-secondary font-semibold">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const totalFaixas = regras.length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-headline-sm font-headline-sm text-primary">Minha disponibilidade</h3>
          <p className="text-body-sm font-body-sm text-on-surface-variant max-w-md">
            Defina os dias e horários em que você atende. Consultas de {durationMin} min são geradas
            automaticamente dentro dessas faixas e aparecem para os pacientes agendarem.
          </p>
        </div>
      </div>

      {erro && (
        <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
          <Icon name="error" size={18} /> {erro}
        </p>
      )}
      {saveState === "salvo" && (
        <p className="flex items-center gap-2 text-body-sm font-body-sm text-secondary">
          <Icon name="check_circle" filled size={16} /> Agenda salva — já disponível para os pacientes.
        </p>
      )}

      <div className="space-y-3">
        {DIAS.map((dia) => {
          const faixas = regrasDoDia(dia.weekday);
          const ativo = faixas.length > 0;
          return (
            <div
              key={dia.weekday}
              className={`rounded-xl border p-4 transition-colors ${
                ativo ? "border-secondary/40 bg-surface-container-low" : "border-outline-variant/50 bg-surface-container-lowest"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => toggleDia(dia.weekday, e.target.checked)}
                    className="w-5 h-5 accent-[#07845a]"
                  />
                  <span className="text-label-lg font-label-lg text-primary">{dia.label}</span>
                </label>
                {ativo && (
                  <button
                    onClick={() => addFaixa(dia.weekday)}
                    className="text-body-sm font-body-sm text-secondary font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Icon name="add" size={16} /> Faixa
                  </button>
                )}
              </div>

              {ativo && (
                <div className="mt-3 space-y-2 pl-8">
                  {faixas.map(({ r, i }) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <input
                        type="time"
                        value={toHHMM(r.startMin)}
                        step={300}
                        onChange={(e) => editarFaixa(i, "startMin", e.target.value)}
                        className="h-10 px-3 rounded-lg border border-outline-variant/60 bg-surface-container text-body-md font-body-md text-on-surface focus:border-secondary focus:outline-none"
                      />
                      <span className="text-on-surface-variant">até</span>
                      <input
                        type="time"
                        value={toHHMM(r.endMin)}
                        step={300}
                        onChange={(e) => editarFaixa(i, "endMin", e.target.value)}
                        className="h-10 px-3 rounded-lg border border-outline-variant/60 bg-surface-container text-body-md font-body-md text-on-surface focus:border-secondary focus:outline-none"
                      />
                      <button
                        onClick={() => removeFaixa(i)}
                        aria-label="Remover faixa"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-error hover:bg-error-container/40 transition-colors"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={salvar}
        disabled={saveState === "salvando"}
        className="sd-aurora h-12 px-6 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
      >
        {saveState === "salvando" ? "SALVANDO…" : "SALVAR AGENDA"}
        {saveState !== "salvando" && <Icon name="save" size={18} />}
      </button>
      {totalFaixas === 0 && (
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Sem nenhuma faixa, você não aparece para agendamento. Marque ao menos um dia.
        </p>
      )}
    </div>
  );
}
