"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { Loading } from "@/components/brand/ui";
import { SubHeader } from "../SubHeader";

type Seguranca = {
  whatsapp: string | null;
  email: string | null;
  google: boolean;
  criadaEm: string;
};

function Metodo({
  icon,
  titulo,
  valor,
  conectado,
}: {
  icon: string;
  titulo: string;
  valor: string;
  conectado: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${conectado ? "bg-primary-container" : "bg-surface-container-high"}`}>
        <Icon name={icon} className={conectado ? "text-white" : "text-on-surface-variant"} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-lg font-label-lg text-on-surface">{titulo}</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant truncate">{valor}</p>
      </div>
      {conectado ? (
        <span className="flex items-center gap-1 text-body-sm font-body-sm text-secondary shrink-0">
          <Icon name="check_circle" size={18} /> Conectado
        </span>
      ) : (
        <span className="text-body-sm font-body-sm text-on-surface-variant/60 shrink-0">Não conectado</span>
      )}
    </div>
  );
}

export default function SegurancaPage() {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<Seguranca | null>(null);

  useEffect(() => {
    fetch("/api/paciente/seguranca")
      .then((r) => r.json())
      .then(setDados)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  return (
    <>
      <SubHeader title="Segurança" />
      <main className="w-full max-w-md mx-auto px-5 pt-2 pb-10 space-y-4">
        {carregando || !dados ? (
          <Loading />
        ) : (
          <>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Formas de acessar sua conta. Quanto mais métodos conectados, mais fácil recuperar o acesso.
            </p>

            <Metodo icon="call" titulo="WhatsApp" valor={dados.whatsapp ?? "Não informado"} conectado={Boolean(dados.whatsapp)} />
            <Metodo icon="alternate_email" titulo="E-mail" valor={dados.email ?? "Não informado"} conectado={Boolean(dados.email)} />
            <Metodo icon="mail" titulo="Google" valor={dados.google ? "Conta Google vinculada" : "Entrar com Google mais rápido"} conectado={dados.google} />

            <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-4 flex items-start gap-3">
              <Icon name="shield_person" size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-label-lg font-label-lg text-on-surface">Sessão neste dispositivo</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  Ativa · conta criada em {new Date(dados.criadaEm).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            <Link
              href="/api/auth/logout"
              className="w-full py-4 px-6 border border-error text-error text-label-lg font-label-lg rounded-xl hover:bg-error-container transition-all flex items-center justify-center gap-2"
            >
              <Icon name="logout" size={20} /> Encerrar sessão
            </Link>
          </>
        )}
      </main>
    </>
  );
}
