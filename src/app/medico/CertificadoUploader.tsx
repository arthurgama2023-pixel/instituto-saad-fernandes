"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";

type Status = {
  configurado: boolean;
  nome: string | null;
  em: string | null;
  criptografiaHabilitada: boolean;
  naoAutenticado?: boolean;
};

export function CertificadoUploader() {
  const [status, setStatus] = useState<Status | null>(null);
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = () => {
    fetch("/api/medico/certificado")
      .then(async (r) => ({ ...(await r.json()), naoAutenticado: r.status === 401 }))
      .then(setStatus)
      .catch(() => setStatus(null));
  };
  useEffect(carregar, []);

  const enviar = async () => {
    setErro(null);
    setOk(false);
    const file = fileRef.current?.files?.[0];
    if (!file) return setErro("Selecione o arquivo .pfx do seu certificado A1.");
    if (!senha) return setErro("Informe a senha do certificado.");

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("senha", senha);
      fd.set("arquivo", file);
      const r = await fetch("/api/medico/certificado", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.error ?? "Não consegui cadastrar o certificado.");
        return;
      }
      setOk(true);
      setSenha("");
      if (fileRef.current) fileRef.current.value = "";
      carregar();
    } catch {
      setErro("Não consegui cadastrar o certificado. Verifique a conexão.");
    } finally {
      setEnviando(false);
    }
  };

  const remover = async () => {
    setErro(null);
    setOk(false);
    await fetch("/api/medico/certificado", { method: "DELETE" }).catch(() => {});
    carregar();
  };

  return (
    <section className="space-y-3">
      <h3 className="text-headline-sm font-headline-sm text-primary mb-1">Certificado digital (ICP-Brasil)</h3>
      <p className="text-body-sm font-body-sm text-on-surface-variant">
        Cadastre seu certificado A1 (.pfx) para que seus documentos (receita, atestado) sejam assinados
        digitalmente em seu nome. O arquivo é guardado criptografado.
      </p>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow p-6 space-y-4">
        {status?.naoAutenticado ? (
          <div className="flex items-start gap-3">
            <Icon name="lock" size={20} className="text-on-surface-variant mt-0.5" />
            <div>
              <p className="text-label-lg font-label-lg text-primary">Entre como médico</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Por segurança, só o médico autenticado gerencia o próprio certificado.{" "}
                <Link href="/medico/login" className="text-secondary font-semibold">
                  Fazer login
                </Link>
              </p>
            </div>
          </div>
        ) : status?.configurado ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-secondary">
              <Icon name="verified_user" filled size={20} />
              <div>
                <p className="text-label-lg font-label-lg text-primary">Certificado ativo</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  {status.nome} · desde {status.em ? new Date(status.em).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
            </div>
            <button
              onClick={remover}
              className="h-10 px-4 rounded-xl border border-outline-variant text-error text-label-md font-label-md hover:border-error transition-colors"
            >
              Remover
            </button>
          </div>
        ) : (
          <>
            {status && !status.criptografiaHabilitada && (
              <p className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
                <Icon name="warning" size={18} /> O servidor não tem APP_ENCRYPTION_KEY configurada — necessária para
                guardar o certificado com segurança.
              </p>
            )}
            {erro && (
              <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
                <Icon name="error" size={18} /> {erro}
              </p>
            )}
            {ok && (
              <p className="flex items-center gap-2 text-body-sm font-body-sm text-secondary">
                <Icon name="check_circle" filled size={16} /> Certificado cadastrado.
              </p>
            )}

            <div className="space-y-2">
              <label htmlFor="cert-file" className="text-label-lg font-label-lg text-primary">Arquivo do certificado (.pfx / .p12)</label>
              <input
                id="cert-file"
                ref={fileRef}
                type="file"
                accept=".pfx,.p12,application/x-pkcs12"
                className="block w-full text-body-sm text-on-surface-variant file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-secondary-container file:text-on-secondary-container file:text-label-md file:font-label-md"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cert-senha" className="text-label-lg font-label-lg text-primary">Senha do certificado</label>
              <input
                id="cert-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="off"
                className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container text-body-md font-body-md text-on-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <button
              onClick={enviar}
              disabled={enviando}
              className="sd-aurora h-12 px-6 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
            >
              {enviando ? "VALIDANDO…" : "CADASTRAR CERTIFICADO"}
              {!enviando && <Icon name="upload" size={18} />}
            </button>
          </>
        )}

        <p className="text-[11px] text-on-surface-variant/70">
          A senha e o arquivo nunca vão para o navegador de volta nem para logs. Use um certificado A1 (arquivo);
          A3 (token) não funciona no servidor.
        </p>
      </div>
    </section>
  );
}
