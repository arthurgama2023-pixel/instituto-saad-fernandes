"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/brand/Icon";
import { Loading } from "@/components/brand/ui";
import { SubHeader } from "../SubHeader";

type Cartao = {
  id: string;
  brand: string;
  last4: string;
  holder: string;
  expMonth: number;
  expYear: number;
  principal: boolean;
};

const inputEl =
  "w-full h-12 px-3 rounded-xl border border-outline-variant/60 bg-surface-container-low text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container focus:border-secondary focus:outline-none";

export default function CartoesPage() {
  const [carregando, setCarregando] = useState(true);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [numero, setNumero] = useState("");
  const [holder, setHolder] = useState("");
  const [validade, setValidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () => {
    fetch("/api/paciente/cartoes")
      .then((r) => r.json())
      .then((d) => setCartoes(d.cartoes ?? []))
      .catch(() => {})
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const numeroLimpo = numero.replace(/\D/g, "");
  const [mm, aa] = validade.split("/");
  const podeAdicionar = numeroLimpo.length >= 13 && holder.trim().length >= 2 && mm?.length === 2 && aa?.length === 2;

  const adicionar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/paciente/cartoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: numeroLimpo,
          holder,
          expMonth: Number(mm),
          expYear: 2000 + Number(aa),
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        setErro(d.error ?? "Não consegui salvar o cartão.");
        return;
      }
      setNumero(""); setHolder(""); setValidade(""); setMostrarForm(false);
      carregar();
    } catch {
      setErro("Não consegui salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
    await fetch(`/api/paciente/cartoes/${id}`, { method: "DELETE" });
    carregar();
  };

  const tornarPrincipal = async (id: string) => {
    await fetch(`/api/paciente/cartoes/${id}`, { method: "PATCH" });
    carregar();
  };

  return (
    <>
      <SubHeader title="Cartões de pagamento" />
      <main className="w-full max-w-md mx-auto px-5 pt-2 pb-10 space-y-4">
        {carregando ? (
          <Loading />
        ) : (
          <>
            {cartoes.length === 0 && !mostrarForm && (
              <p className="text-body-md font-body-md text-on-surface-variant text-center py-6">
                Nenhum cartão cadastrado ainda.
              </p>
            )}

            {cartoes.map((c) => (
              <div key={c.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 brand-shadow flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                  <Icon name="credit_card" className="text-white" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label-lg font-label-lg text-primary flex items-center gap-2">
                    {c.brand} •••• {c.last4}
                    {c.principal && (
                      <span className="text-[10px] font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">Principal</span>
                    )}
                  </p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    {c.holder} · {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}
                  </p>
                  {!c.principal && (
                    <button onClick={() => tornarPrincipal(c.id)} className="mt-1 text-body-sm font-body-sm text-secondary font-semibold">
                      Tornar principal
                    </button>
                  )}
                </div>
                <button onClick={() => remover(c.id)} aria-label="Remover cartão" className="text-error hover:bg-error-container/40 rounded-full p-1 shrink-0">
                  <Icon name="delete" size={20} />
                </button>
              </div>
            ))}

            {mostrarForm ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 space-y-3">
                <input className={inputEl} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número do cartão" inputMode="numeric" />
                <input className={inputEl} value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Nome impresso no cartão" />
                <input className={inputEl} value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="Validade (MM/AA)" inputMode="numeric" />

                {erro && <p className="text-body-sm font-body-sm text-error">{erro}</p>}

                <div className="flex gap-3">
                  <button onClick={() => { setMostrarForm(false); setNumero(""); setHolder(""); setValidade(""); setErro(null); }} className="flex-1 h-12 rounded-xl border border-outline-variant/60 text-label-lg font-label-lg text-on-surface">
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
                <Icon name="add" size={22} /> Adicionar cartão
              </button>
            )}

            <p className="text-body-sm font-body-sm text-on-surface-variant/70 flex items-start gap-2 pt-2">
              <Icon name="lock" size={16} className="shrink-0 mt-0.5" />
              Demonstração: guardamos só a bandeira e os últimos 4 dígitos. O número completo e o CVV nunca são
              armazenados.
            </p>
          </>
        )}
      </main>
    </>
  );
}
