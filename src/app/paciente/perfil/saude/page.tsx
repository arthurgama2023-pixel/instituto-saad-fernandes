"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { Loading } from "@/components/brand/ui";

type SaveState = "idle" | "salvando" | "salvo" | "erro";

export default function SaudePage() {
  const [carregando, setCarregando] = useState(true);
  const [condicoesCronicas, setCondicoesCronicas] = useState("");
  const [alergias, setAlergias] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/paciente/saude")
      .then((r) => r.json())
      .then((d) => {
        setCondicoesCronicas(d.condicoesCronicas ?? "");
        setAlergias(d.alergias ?? "");
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const salvar = async () => {
    setSaveState("salvando");
    try {
      const r = await fetch("/api/paciente/saude", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condicoesCronicas, alergias }),
      });
      setSaveState(r.ok ? "salvo" : "erro");
    } catch {
      setSaveState("erro");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full flex items-center gap-3 px-5 py-4">
        <Link
          href="/paciente/perfil"
          aria-label="Voltar"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors -ml-2"
        >
          <Icon name="arrow_back_ios_new" className="text-primary" size={20} />
        </Link>
        <h1 className="text-headline-sm font-headline-sm text-primary">Doenças crônicas e alergias</h1>
      </header>

      <main className="w-full max-w-md mx-auto px-5 pt-2 pb-10 space-y-6">
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Essas informações ficam disponíveis para o médico antes e durante a consulta — ajudam a evitar riscos
          (interações medicamentosas, contraindicações) e agilizam o atendimento.
        </p>

        {carregando ? (
          <Loading />
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="condicoes" className="text-label-lg font-label-lg text-primary flex items-center gap-2">
                <Icon name="monitor_heart" size={20} /> Doenças crônicas
              </label>
              <textarea
                id="condicoes"
                value={condicoesCronicas}
                onChange={(e) => {
                  setCondicoesCronicas(e.target.value);
                  setSaveState("idle");
                }}
                placeholder="Ex.: diabetes tipo 2, hipertensão, hipotireoidismo…"
                maxLength={2000}
                className="w-full min-h-[110px] p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container resize-y focus:border-secondary focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="alergias" className="text-label-lg font-label-lg text-primary flex items-center gap-2">
                <Icon name="warning" size={20} /> Alergias
              </label>
              <textarea
                id="alergias"
                value={alergias}
                onChange={(e) => {
                  setAlergias(e.target.value);
                  setSaveState("idle");
                }}
                placeholder="Ex.: dipirona, amendoim, látex…"
                maxLength={2000}
                className="w-full min-h-[110px] p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container resize-y focus:border-secondary focus:outline-none"
              />
            </div>

            <button
              onClick={salvar}
              disabled={saveState === "salvando"}
              className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {saveState === "salvando" ? "SALVANDO…" : "SALVAR"}
            </button>

            {saveState === "salvo" && (
              <p className="flex items-center gap-2 text-body-sm font-body-sm text-secondary justify-center">
                <Icon name="check_circle" size={18} /> Salvo — já visível para seus médicos.
              </p>
            )}
            {saveState === "erro" && (
              <p className="flex items-center gap-2 text-body-sm font-body-sm text-error justify-center">
                <Icon name="error" size={18} /> Não consegui salvar. Tente de novo.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
