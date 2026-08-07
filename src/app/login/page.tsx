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

export default function LoginPaciente() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Mensagem quando o login social volta com erro (?erro=... no callback).
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("erro");
    if (e === "config") setErro("Login com Google ainda não configurado neste ambiente.");
    else if (e) setErro("Não foi possível entrar com o Google. Tente novamente.");
  }, []);

  const pode = identificador.trim().length > 2 && senha.length > 0;

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pode) return;
    setEntrando(true);
    // Demo: ainda não há verificação de senha — o app usa a sessão por cookie.
    router.push("/paciente");
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
          <h1 className="text-headline-lg font-headline-lg text-primary mb-2">Bem-vindo(a)</h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
            Acesse sua conta para agendar consultas e falar com a Clara.
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
              placeholder="E-mail ou CPF"
              autoComplete="username"
              aria-label="E-mail ou CPF"
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
            <button type="button" className="text-body-sm font-body-sm text-secondary font-semibold">
              Esqueci minha senha
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!pode || entrando}
          className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg mt-6 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 shadow-lg"
        >
          {entrando ? "ENTRANDO…" : "ENTRAR"}
        </button>

        <div className="flex items-center gap-3 my-6">
          <span className="flex-1 h-px bg-outline-variant/60" />
          <span className="text-body-sm font-body-sm text-on-surface-variant">ou continue com</span>
          <span className="flex-1 h-px bg-outline-variant/60" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SocialBtn
            label="Google"
            icon="mail"
            onClick={() => {
              window.location.href = "/api/auth/google/login?area=paciente";
            }}
          />
          <SocialBtn label="Apple" icon="phone_iphone" emBreve />
        </div>

        <div className="text-center py-6 mt-auto">
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Ainda não tem conta?{" "}
            <Link href="/paciente" className="text-secondary font-semibold">
              Cadastre-se
            </Link>
          </p>
          <p className="mt-2 text-body-sm font-body-sm text-on-surface-variant/70">
            É médico?{" "}
            <Link href="/medico/login" className="text-secondary font-semibold">
              Acesse a área do médico
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}

function SocialBtn({
  label,
  icon,
  onClick,
  emBreve,
}: {
  label: string;
  icon: string;
  onClick?: () => void;
  emBreve?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={emBreve}
      title={emBreve ? "Em breve" : undefined}
      className="relative flex items-center justify-center gap-2 h-12 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest text-label-lg font-label-lg text-primary hover:border-secondary transition-colors active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:border-outline-variant/60"
    >
      <Icon name={icon} size={20} className="text-on-surface-variant" />
      {label}
      {emBreve && (
        <span className="absolute -top-2 -right-1 text-[9px] leading-none px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/60">
          em breve
        </span>
      )}
    </button>
  );
}
