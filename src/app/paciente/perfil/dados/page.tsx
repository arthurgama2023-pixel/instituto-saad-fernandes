"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/brand/Icon";
import { Loading } from "@/components/brand/ui";
import { SubHeader } from "../SubHeader";

type SaveState = "idle" | "salvando" | "salvo" | "erro";

const inputWrap =
  "flex items-center gap-3 h-14 px-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low focus-within:border-secondary transition-colors";
const inputEl =
  "flex-1 bg-transparent border-0 outline-none text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container";

export default function DadosPessoaisPage() {
  const [carregando, setCarregando] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/paciente/dados")
      .then((r) => r.json())
      .then((d) => {
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const salvar = async () => {
    setSaveState("salvando");
    setErro(null);
    try {
      const r = await fetch("/api/paciente/dados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErro(data.error ?? "Não consegui salvar.");
        setSaveState("erro");
        return;
      }
      setPhone(data.phone ?? "");
      setSaveState("salvo");
    } catch {
      setErro("Não consegui salvar. Verifique a conexão.");
      setSaveState("erro");
    }
  };

  const marcarAlterado = () => setSaveState("idle");

  return (
    <>
      <SubHeader title="Dados pessoais" />
      <main className="w-full max-w-md mx-auto px-5 pt-2 pb-10 space-y-5">
        {carregando ? (
          <Loading />
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-label-md font-label-md text-on-surface-variant px-1">Nome completo</label>
              <div className={inputWrap}>
                <Icon name="person" className="text-on-surface-variant" size={22} />
                <input className={inputEl} value={name} onChange={(e) => { setName(e.target.value); marcarAlterado(); }} placeholder="Seu nome" aria-label="Nome completo" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-label-md font-label-md text-on-surface-variant px-1">E-mail</label>
              <div className={inputWrap}>
                <Icon name="alternate_email" className="text-on-surface-variant" size={22} />
                <input className={inputEl} type="email" value={email} onChange={(e) => { setEmail(e.target.value); marcarAlterado(); }} placeholder="voce@exemplo.com" aria-label="E-mail" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-label-md font-label-md text-on-surface-variant px-1">WhatsApp</label>
              <div className={inputWrap}>
                <Icon name="call" className="text-on-surface-variant" size={22} />
                <input className={inputEl} value={phone} onChange={(e) => { setPhone(e.target.value); marcarAlterado(); }} placeholder="(11) 99999-9999" inputMode="tel" aria-label="WhatsApp" />
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant/70 px-1">É o número que você usa para entrar no app.</p>
            </div>

            {erro && (
              <p className="flex items-center gap-2 text-body-sm font-body-sm text-error">
                <Icon name="error" size={18} /> {erro}
              </p>
            )}

            <button
              onClick={salvar}
              disabled={saveState === "salvando" || name.trim().length < 2}
              className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {saveState === "salvando" ? "SALVANDO…" : "SALVAR"}
            </button>

            {saveState === "salvo" && (
              <p className="flex items-center gap-2 text-body-sm font-body-sm text-secondary justify-center">
                <Icon name="check_circle" size={18} /> Dados atualizados.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
