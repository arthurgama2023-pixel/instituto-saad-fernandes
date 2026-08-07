"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { LogoMark } from "@/components/LogoMark";

const inputWrap =
  "flex items-center gap-3 h-14 px-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low focus-within:border-secondary focus-within:bg-surface-container-lowest transition-colors";
const inputEl =
  "flex-1 bg-transparent border-0 outline-none text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container";

function AtivarInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [carregandoToken, setCarregandoToken] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Valida o token ao abrir e pré-preenche nome/e-mail.
  useEffect(() => {
    if (!token) {
      setCarregandoToken(false);
      return;
    }
    fetch(`/api/medico/ativar?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setNome(d.nome ?? "");
        setEmail(d.email ?? "");
        setTokenValido(true);
      })
      .finally(() => setCarregandoToken(false));
  }, [token]);

  const senhaOk = senha.length >= 6;
  const confereOk = confirma.length > 0 && confirma === senha;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const pode = emailOk && senhaOk && confereOk && !salvando;

  const ativar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!emailOk) return setErro("Digite um e-mail válido para o login.");
    if (!senhaOk) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (!confereOk) return setErro("As senhas não conferem.");

    setSalvando(true);
    try {
      const res = await fetch("/api/medico/ativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: email.trim(), senha }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErro(body.error ?? "Não foi possível ativar o acesso.");
        return;
      }
      setSucesso(true);
    } catch {
      setErro("Não consegui ativar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregandoToken) {
    return <Centro><p className="text-body-md font-body-md text-on-surface-variant">Validando seu link…</p></Centro>;
  }

  if (!token || !tokenValido) {
    return (
      <Centro>
        <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
          <Icon name="link_off" className="text-on-error-container" size={36} />
        </div>
        <h1 className="text-headline-md font-headline-md text-primary">Link inválido ou expirado</h1>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-[320px]">
          Peça uma nova aprovação à equipe ou entre em contato com o suporte.
        </p>
        <Link href="/" className="text-secondary font-semibold text-label-lg">Voltar ao início</Link>
      </Centro>
    );
  }

  if (sucesso) {
    return (
      <Centro>
        <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
          <Icon name="check_circle" filled className="text-secondary" size={40} />
        </div>
        <h1 className="text-headline-md font-headline-md text-primary">Acesso criado!</h1>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-[320px]">
          Pronto{nome ? `, ${nome.trim().split(/\s+/)[0]}` : ""}. Agora entre com seu e-mail e a senha que você acabou de criar.
        </p>
        <Link
          href="/medico/login"
          className="w-full max-w-[320px] h-14 bg-primary-container text-white rounded-2xl text-label-lg font-label-lg flex items-center justify-center shadow-lg active:scale-[0.98] transition-transform"
        >
          IR PARA O LOGIN
        </Link>
      </Centro>
    );
  }

  return (
    <div className="brand-app min-h-screen bg-background text-on-background">
      <main className="w-full max-w-[440px] mx-auto min-h-screen flex flex-col">
        <form onSubmit={ativar} className="flex-1 flex flex-col px-6 py-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-6"><LogoMark size={64} /></div>
            <span className="inline-block bg-primary-container text-white text-label-md font-label-md tracking-widest px-4 py-1.5 rounded-full mb-4">
              ÁREA DO MÉDICO
            </span>
            <h1 className="text-headline-lg font-headline-lg text-primary mb-2">Crie seu acesso</h1>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
              {nome ? `${nome}, seu ` : "Seu "}cadastro foi aprovado. Defina o e-mail e a senha para entrar.
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
              <input className={inputEl} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail (seu login)" autoComplete="username" aria-label="E-mail de login" type="email" />
            </div>
            <div className={inputWrap}>
              <Icon name="lock" className="text-on-surface-variant" size={22} />
              <input className={inputEl} type={verSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha (mín. 6 caracteres)" autoComplete="new-password" aria-label="Senha" />
              <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"} className="text-on-surface-variant hover:text-primary">
                <Icon name={verSenha ? "visibility_off" : "visibility"} size={22} />
              </button>
            </div>
            <div className={inputWrap}>
              <Icon name="lock" className="text-on-surface-variant" size={22} />
              <input className={inputEl} type={verSenha ? "text" : "password"} value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="Confirmar senha" autoComplete="new-password" aria-label="Confirmar senha" />
            </div>
            {confirma.length > 0 && confirma !== senha && (
              <p className="text-body-sm font-body-sm text-error px-1">As senhas não conferem.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!pode}
            className="w-full h-14 bg-primary-container text-white text-label-lg font-label-lg rounded-2xl mt-6 hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 shadow-lg"
          >
            {salvando ? "CRIANDO…" : "CRIAR ACESSO"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-app min-h-screen bg-background text-on-background">
      <main className="w-full max-w-[440px] mx-auto min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
        {children}
      </main>
    </div>
  );
}

export default function AtivarMedico() {
  return (
    <Suspense fallback={null}>
      <AtivarInner />
    </Suspense>
  );
}
