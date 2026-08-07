"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { LogoMark } from "@/components/LogoMark";

const inputWrap =
  "flex items-center gap-3 h-14 px-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low focus-within:border-secondary focus-within:bg-surface-container-lowest transition-colors";
const inputEl =
  "flex-1 bg-transparent border-0 outline-none text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container";

export default function LoginMedico() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("erro");
    if (e === "config") setErro("Login com Google ainda não configurado neste ambiente.");
    else if (e) setErro("Não foi possível entrar com o Google. Tente novamente.");
  }, []);

  const pode = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identificador.trim()) && senha.length > 0;

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pode) return;
    setErro(null);
    setEntrando(true);
    try {
      const res = await fetch("/api/medico/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identificador.trim(), senha }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErro(body.error ?? "Não foi possível entrar.");
        return;
      }
      router.push("/medico");
      router.refresh();
    } catch {
      setErro("Não consegui entrar. Verifique a conexão.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <main className="w-full max-w-[440px] mx-auto min-h-screen flex flex-col">
      <header className="flex items-center px-4 py-4">
        <Link href="/" aria-label="Voltar" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
          <Icon name="arrow_back_ios_new" className="text-primary" size={20} />
        </Link>
      </header>

      <form onSubmit={entrar} className="flex-1 flex flex-col px-6">
        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="mb-8">
            <LogoMark size={72} />
          </div>

          <span className="inline-block bg-primary-container text-white text-label-md font-label-md tracking-widest px-4 py-1.5 rounded-full mb-4">
            ÁREA DO MÉDICO
          </span>
          <h1 className="text-headline-lg font-headline-lg text-primary mb-3">Acesso do Profissional</h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
            Informe suas credenciais para gerenciar sua agenda e pacientes.
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
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="E-mail"
              autoComplete="username"
              aria-label="E-mail"
            />
          </div>

          <div className={inputWrap}>
            <Icon name="lock" className="text-on-surface-variant" size={22} />
            <input
              className={inputEl}
              type={verSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              aria-label="Senha"
            />
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              className="text-on-surface-variant hover:text-primary"
            >
              <Icon name={verSenha ? "visibility_off" : "visibility"} size={22} />
            </button>
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-body-sm font-body-sm text-primary font-semibold">
              Esqueci minha senha
            </button>
          </div>
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          disabled={!pode || entrando}
          className="w-full h-14 bg-primary-container text-white text-label-lg font-label-lg rounded-2xl hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 shadow-lg"
        >
          {entrando ? "ENTRANDO…" : "ENTRAR"}
        </button>

        <div className="flex items-center gap-3 my-6">
          <span className="flex-1 h-px bg-outline-variant/60" />
          <span className="text-body-sm font-body-sm text-on-surface-variant">ou continue com</span>
          <span className="flex-1 h-px bg-outline-variant/60" />
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/auth/google/login?area=medico";
          }}
          className="flex items-center justify-center gap-2 h-12 w-full rounded-2xl border border-outline-variant/60 bg-surface-container-lowest text-label-lg font-label-lg text-primary hover:border-secondary transition-colors active:scale-[0.98]"
        >
          <Icon name="mail" size={20} className="text-on-surface-variant" />
          Entrar com Google
        </button>

        <div className="text-center py-6 space-y-2">
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Ainda não tem conta?{" "}
            <Link href="/medico/cadastro" className="text-secondary font-semibold">
              Cadastre-se
            </Link>
          </p>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Dificuldades para acessar? <span className="text-primary font-semibold">Entre em contato com o suporte.</span>
          </p>
        </div>
      </form>
    </main>
  );
}
