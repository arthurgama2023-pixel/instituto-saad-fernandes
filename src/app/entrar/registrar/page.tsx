"use client";

import { useState } from "react";
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

// Registro do PACIENTE: nome (exibição) + e-mail OU telefone (identificador de
// login) + senha + confirmar senha.
export default function RegistrarPaciente() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const nomeOk = nome.trim().split(/\s+/).filter(Boolean).length >= 2;
  const credencial = parseIdentificador(identificador);
  const senhaOk = senha.length >= 6;
  const confereOk = confirma.length > 0 && confirma === senha;
  const pode = nomeOk && !!credencial && senhaOk && confereOk;

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!nomeOk) return setErro("Digite seu nome completo (nome e sobrenome).");
    if (!credencial) return setErro("Digite um e-mail ou telefone válido.");
    if (!senhaOk) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (!confereOk) return setErro("As senhas não conferem.");

    setCarregando(true);
    try {
      const supabase = createClient();
      const base = { password: senha, options: { data: { name: nome.trim(), role: "patient" } } };
      const { error } =
        credencial.tipo === "email"
          ? await supabase.auth.signUp({ email: credencial.email, ...base })
          : await supabase.auth.signUp({ phone: credencial.phone, ...base });
      if (error) {
        setErro(
          /already registered|already exists|user_already_exists/i.test(error.message)
            ? "Já existe uma conta com esse e-mail/telefone. Tente entrar."
            : error.message
        );
        return;
      }
      // Conta criada. Desloga a sessão automática do cadastro e leva ao login,
      // pra pessoa entrar de propósito com as credenciais que acabou de criar.
      await supabase.auth.signOut();
      setSucesso(true);
    } catch {
      setErro("Não consegui criar a conta. Verifique a conexão.");
    } finally {
      setCarregando(false);
    }
  };

  if (sucesso) {
    return (
      <main className="w-full max-w-[440px] mx-auto min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <LogoMark size={64} />
        <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
          <Icon name="check_circle" filled className="text-secondary" size={40} />
        </div>
        <h1 className="text-headline-md font-headline-md text-primary">Conta criada!</h1>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
          Tudo certo, {nome.trim().split(/\s+/)[0]}. Agora é só entrar com o e-mail ou telefone
          e a senha que você acabou de criar.
        </p>
        <Link
          href="/entrar"
          className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg flex items-center justify-center shadow-lg active:scale-[0.98] transition-transform"
        >
          IR PARA O LOGIN
        </Link>
      </main>
    );
  }

  return (
    <main className="w-full max-w-[440px] mx-auto min-h-screen flex flex-col">
      <header className="flex items-center px-4 py-4">
        <Link href="/entrar" aria-label="Voltar" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
          <Icon name="arrow_back_ios_new" className="text-primary" size={20} />
        </Link>
      </header>

      <form onSubmit={registrar} className="flex-1 flex flex-col px-6">
        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="mb-8">
            <LogoMark size={72} />
          </div>
          <h1 className="text-headline-lg font-headline-lg text-primary mb-2">Criar conta</h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-[300px]">
            É rápido. Você usa o e-mail ou telefone e a senha para entrar depois.
          </p>
        </div>

        {erro && (
          <p role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
            <Icon name="error" size={18} /> {erro}
          </p>
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
              placeholder="Senha (mín. 6 caracteres)"
              autoComplete="new-password"
              aria-label="Senha"
            />
            <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"} className="text-on-surface-variant hover:text-primary">
              <Icon name={verSenha ? "visibility_off" : "visibility"} size={22} />
            </button>
          </div>

          <div className={inputWrap}>
            <Icon name="lock" className="text-on-surface-variant" size={22} />
            <input
              className={inputEl}
              type={verSenha ? "text" : "password"}
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="Confirmar senha"
              autoComplete="new-password"
              aria-label="Confirmar senha"
            />
          </div>
          {confirma.length > 0 && confirma !== senha && (
            <p className="text-body-sm font-body-sm text-error px-1">As senhas não conferem.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!pode || carregando}
          className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg mt-6 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 shadow-lg"
        >
          {carregando ? "CRIANDO…" : "CRIAR CONTA"}
        </button>

        <div className="text-center py-6 mt-auto">
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Já tem conta?{" "}
            <Link href="/entrar" className="text-secondary font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
