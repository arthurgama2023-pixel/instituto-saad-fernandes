"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { LogoMark } from "@/components/LogoMark";

const inputWrap =
  "flex items-center gap-3 h-14 px-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low focus-within:border-secondary focus-within:bg-surface-container-lowest transition-colors";
const inputEl =
  "flex-1 bg-transparent border-0 outline-none text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container";

export default function CadastroPaciente() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pode = nome.trim().length >= 2 && whatsapp.trim().length >= 8;

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pode) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/paciente/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, whatsapp, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não consegui criar sua conta.");
        return;
      }
      router.push("/paciente");
    } catch {
      setErro("Não consegui criar sua conta. Verifique a conexão.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="w-full max-w-[440px] mx-auto min-h-screen flex flex-col">
      <header className="flex items-center px-4 py-4">
        <Link
          href="/"
          aria-label="Voltar"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
        >
          <Icon name="arrow_back_ios_new" className="text-primary" size={20} />
        </Link>
      </header>

      <form onSubmit={cadastrar} className="flex-1 flex flex-col px-6">
        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="mb-8">
            <LogoMark size={72} />
          </div>
          <h1 className="text-headline-lg font-headline-lg text-primary mb-2">Criar conta</h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
            Leva menos de um minuto. Você usa o WhatsApp pra entrar depois.
          </p>
        </div>

        {erro && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-error/40 bg-error-container/40 px-4 py-3 text-body-sm font-body-sm text-on-error-container">
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className={inputWrap}>
            <Icon name="person" className="text-on-surface-variant" size={22} />
            <input
              className={inputEl}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              autoComplete="name"
              aria-label="Nome completo"
            />
          </div>

          <div className={inputWrap}>
            <Icon name="call" className="text-on-surface-variant" size={22} />
            <input
              className={inputEl}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              inputMode="tel"
              aria-label="WhatsApp"
            />
          </div>

          <div className={inputWrap}>
            <Icon name="alternate_email" className="text-on-surface-variant" size={22} />
            <input
              className={inputEl}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail (opcional)"
              autoComplete="email"
              aria-label="E-mail (opcional)"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!pode || carregando}
          className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg mt-6 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 shadow-lg"
        >
          {carregando ? "CRIANDO CONTA…" : "CRIAR CONTA"}
        </button>

        <div className="text-center py-6 mt-auto">
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Já tem conta?{" "}
            <Link href="/login" className="text-secondary font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
