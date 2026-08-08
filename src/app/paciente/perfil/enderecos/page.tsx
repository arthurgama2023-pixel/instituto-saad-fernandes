"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/brand/Icon";
import { Loading } from "@/components/brand/ui";
import { SubHeader } from "../SubHeader";

type Endereco = {
  id: string;
  label: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  principal: boolean;
};

const inputEl =
  "w-full h-12 px-3 rounded-xl border border-outline-variant/60 bg-surface-container-low text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container focus:border-secondary focus:outline-none";

const VAZIO = { label: "Casa", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };

export default function EnderecosPage() {
  const [carregando, setCarregando] = useState(true);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [form, setForm] = useState(VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () => {
    fetch("/api/paciente/enderecos")
      .then((r) => r.json())
      .then((d) => setEnderecos(d.enderecos ?? []))
      .catch(() => {})
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const set = (campo: keyof typeof VAZIO, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const podeAdicionar =
    form.cep.trim().length >= 8 && form.logradouro.trim() && form.numero.trim() && form.bairro.trim() && form.cidade.trim() && form.uf.trim().length === 2;

  const adicionar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/paciente/enderecos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const d = await r.json();
        setErro(d.error ?? "Não consegui salvar o endereço.");
        return;
      }
      setForm(VAZIO);
      setMostrarForm(false);
      carregar();
    } catch {
      setErro("Não consegui salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
    await fetch(`/api/paciente/enderecos/${id}`, { method: "DELETE" });
    carregar();
  };

  const tornarPrincipal = async (id: string) => {
    await fetch(`/api/paciente/enderecos/${id}`, { method: "PATCH" });
    carregar();
  };

  return (
    <>
      <SubHeader title="Endereços" />
      <main className="w-full max-w-md mx-auto px-5 pt-2 pb-10 space-y-4">
        {carregando ? (
          <Loading />
        ) : (
          <>
            {enderecos.length === 0 && !mostrarForm && (
              <p className="text-body-md font-body-md text-on-surface-variant text-center py-6">
                Você ainda não cadastrou nenhum endereço.
              </p>
            )}

            {enderecos.map((e) => (
              <div key={e.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 brand-shadow">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="flex items-center gap-2 text-label-lg font-label-lg text-primary">
                    <Icon name="location_on" size={20} /> {e.label}
                    {e.principal && (
                      <span className="text-[10px] font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
                        Principal
                      </span>
                    )}
                  </span>
                  <button onClick={() => remover(e.id)} aria-label="Remover endereço" className="text-error hover:bg-error-container/40 rounded-full p-1">
                    <Icon name="delete" size={20} />
                  </button>
                </div>
                <p className="text-body-md font-body-md text-on-surface">
                  {e.logradouro}, {e.numero}
                  {e.complemento ? ` — ${e.complemento}` : ""}
                </p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  {e.bairro} · {e.cidade}/{e.uf} · CEP {e.cep}
                </p>
                {!e.principal && (
                  <button onClick={() => tornarPrincipal(e.id)} className="mt-2 text-body-sm font-body-sm text-secondary font-semibold">
                    Tornar principal
                  </button>
                )}
              </div>
            ))}

            {mostrarForm ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 space-y-3">
                <input className={inputEl} value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Rótulo (Casa, Trabalho…)" />
                <input className={inputEl} value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="CEP" inputMode="numeric" />
                <input className={inputEl} value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="Logradouro (rua/av.)" />
                <div className="flex gap-3">
                  <input className={inputEl} value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="Número" />
                  <input className={inputEl} value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Compl." />
                </div>
                <input className={inputEl} value={form.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="Bairro" />
                <div className="flex gap-3">
                  <input className={inputEl} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Cidade" />
                  <input className={`${inputEl} w-20 uppercase`} value={form.uf} onChange={(e) => set("uf", e.target.value.slice(0, 2))} placeholder="UF" maxLength={2} />
                </div>

                {erro && <p className="text-body-sm font-body-sm text-error">{erro}</p>}

                <div className="flex gap-3">
                  <button onClick={() => { setMostrarForm(false); setForm(VAZIO); setErro(null); }} className="flex-1 h-12 rounded-xl border border-outline-variant/60 text-label-lg font-label-lg text-on-surface">
                    Cancelar
                  </button>
                  <button onClick={adicionar} disabled={!podeAdicionar || salvando} className="sd-aurora flex-1 h-12 rounded-xl text-label-lg font-label-lg disabled:opacity-50">
                    {salvando ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setMostrarForm(true)}
                className="w-full h-14 rounded-2xl border-2 border-dashed border-outline-variant/60 text-label-lg font-label-lg text-secondary flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors"
              >
                <Icon name="add" size={22} /> Adicionar endereço
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}
