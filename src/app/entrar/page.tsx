"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { LogoMark } from "@/components/LogoMark";
import { createClient } from "@/lib/supabase/client";
import { parseIdentificador } from "@/lib/auth-identidade";

const inputWrap =
  "flex items-center gap-3 h-14 px-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low focus-within:border-secondary focus-within:bg-surface-container-lowest transition-colors";
const inputEl =
  "flex-1 bg-transparent border-0 outline-none text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container";

// Login do PACIENTE: e-mail OU telefone + senha (coerente com o registro).
// Médico tem fluxo à parte (/medico/login).
export default function EntrarReal() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const credencial = parseIdentificador(identificador);
  const pode = !!credencial && senha.length > 0;

  // Mensagem quando o login social (Google) volta com erro (?erro=... — pode
  // chegar via redirect de /login ou direto do callback do Google).
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("erro");
    if (e === "config") setErro("Login com Google ainda não configurado neste ambiente.");
    else if (e) setErro("Não foi possível entrar com o Google. Tente novamente.");
  }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!credencial) return setErro("Digite o e-mail ou telefone da sua conta.");

    setCarregando(true);
    try {
      const supabase = createClient();
      const { error } =
        credencial.tipo === "email"
          ? await supabase.auth.signInWithPassword({ email: credencial.email, password: senha })
          : await supabase.auth.signInWithPassword({ phone: credencial.phone, password: senha });
      if (error) {
        setErro(
          /invalid login credentials/i.test(error.message)
            ? "E-mail/telefone ou senha incorretos."
            : error.message
        );
        return;
      }
      // Entrou: leva para a plataforma do paciente.
      router.push("/paciente");
    } catch {
      setErro("Não consegui entrar. Verifique a conexão.");
    } finally {
      setCarregando(false);
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
          <h1 className="text-headline-lg font-headline-lg text-primary mb-2">Entrar</h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
            Acesse sua conta com seu e-mail ou telefone e a senha.
          </p>
        </div>

        {erro && (
          <p role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
            <Icon name="error" size={18} /> {erro}
          </p>
        )}

        <div className="space-y-4">
          <div className={inputWrap}>
            <Icon name="alternate_email" className="text-on-surface-variant" size={22} />
            <input
              className={inputEl}
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="E-mail ou telefone"
              autoComplete="username"
              aria-label="E-mail ou telefone"
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
            <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"} className="text-on-surface-variant hover:text-primary">
              <Icon name={verSenha ? "visibility_off" : "visibility"} size={22} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!pode || carregando}
          className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg mt-6 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 shadow-lg"
        >
          {carregando ? "ENTRANDO…" : "ENTRAR"}
        </button>

        <div className="text-center py-6 mt-auto">
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Ainda não tem conta?{" "}
            <Link href="/entrar/registrar" className="text-secondary font-semibold">
              Criar conta
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
