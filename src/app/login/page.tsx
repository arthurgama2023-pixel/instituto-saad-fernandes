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
  const [etapa, setEtapa] = useState<"whatsapp" | "codigo">("whatsapp");
  const [whatsapp, setWhatsapp] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Mensagem quando o login social volta com erro (?erro=... no callback).
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("erro");
    if (e === "config") setErro("Login com Google ainda não configurado neste ambiente.");
    else if (e === "token") setErro("Esse link de confirmação já foi usado ou expirou. Entre com o WhatsApp abaixo.");
    else if (e) setErro("Não foi possível entrar com o Google. Tente novamente.");
  }, []);

  const enviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (whatsapp.trim().length < 8) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/paciente/otp/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não consegui enviar o código.");
        return;
      }
      setNome(data.nome);
      // MVP sem WhatsApp real conectado: o código vem na resposta pra exibir na tela.
      setDevCode(data.devCode ?? null);
      setEtapa("codigo");
    } catch {
      setErro("Não consegui enviar o código. Verifique a conexão.");
    } finally {
      setCarregando(false);
    }
  };

  const confirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.trim().length !== 6) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/paciente/otp/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp, codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Código incorreto ou expirado.");
        return;
      }
      router.push("/paciente");
    } catch {
      setErro("Não consegui confirmar o código. Verifique a conexão.");
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

      <form onSubmit={etapa === "whatsapp" ? enviarCodigo : confirmarCodigo} className="flex-1 flex flex-col px-6">
        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="mb-8">
            <LogoMark size={72} />
          </div>
          <h1 className="text-headline-lg font-headline-lg text-primary mb-2">
            {etapa === "whatsapp" ? "Bem-vindo(a)" : `Olá, ${nome?.split(" ")[0] ?? ""}`}
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
            {etapa === "whatsapp"
              ? "Informe o WhatsApp cadastrado para receber um código de acesso."
              : `Enviamos um código de 6 dígitos para ${whatsapp}.`}
          </p>
        </div>

        {erro && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-error/40 bg-error-container/40 px-4 py-3 text-body-sm font-body-sm text-on-error-container">
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {devCode && etapa === "codigo" && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-secondary/40 bg-secondary-container/40 px-4 py-3 text-body-sm font-body-sm text-on-secondary-container">
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            <span>
              WhatsApp ainda não conectado neste ambiente — seu código de teste é <strong>{devCode}</strong>.
            </span>
          </div>
        )}

        {etapa === "whatsapp" ? (
          <div className="space-y-4">
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className={inputWrap}>
              <Icon name="password" className="text-on-surface-variant" size={22} />
              <input
                className={`${inputEl} tracking-[0.3em] text-center`}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                aria-label="Código de 6 dígitos"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEtapa("whatsapp");
                setCodigo("");
                setErro(null);
              }}
              className="text-body-sm font-body-sm text-secondary font-semibold"
            >
              Trocar número
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={carregando || (etapa === "whatsapp" ? whatsapp.trim().length < 8 : codigo.length !== 6)}
          className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg mt-6 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 shadow-lg"
        >
          {carregando ? "AGUARDE…" : etapa === "whatsapp" ? "ENVIAR CÓDIGO" : "ENTRAR"}
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
            <Link href="/cadastro" className="text-secondary font-semibold">
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
