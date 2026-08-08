"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { SubHeader } from "../SubHeader";

export default function PrivacidadePage() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    setExcluindo(true);
    try {
      await fetch("/api/paciente/excluir", { method: "POST" });
      router.push("/");
    } catch {
      setExcluindo(false);
    }
  };

  return (
    <>
      <SubHeader title="Privacidade" />
      <main className="w-full max-w-md mx-auto px-5 pt-2 pb-10 space-y-6">
        <section className="space-y-3">
          <h2 className="text-label-lg font-label-lg text-primary flex items-center gap-2">
            <Icon name="download" size={20} /> Baixar meus dados
          </h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Direito de portabilidade (LGPD). Baixe um arquivo com sua conta, consultas, documentos, endereços e
            cartões.
          </p>
          <a
            href="/api/paciente/exportar"
            className="w-full h-14 rounded-2xl border border-outline-variant/60 text-label-lg font-label-lg text-primary flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors"
          >
            <Icon name="file_download" size={20} /> Exportar dados (JSON)
          </a>
        </section>

        <div className="h-px bg-outline-variant/30" />

        <section className="space-y-3">
          <h2 className="text-label-lg font-label-lg text-error flex items-center gap-2">
            <Icon name="delete_forever" size={20} /> Excluir minha conta
          </h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Sua conta e seus dados pessoais (endereços, cartões, informações de saúde) são apagados. Por exigência do
            CFM, o histórico clínico das consultas é guardado por 20 anos de forma anonimizada.
          </p>

          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              className="w-full py-4 px-6 border border-error text-error text-label-lg font-label-lg rounded-xl hover:bg-error-container transition-all flex items-center justify-center gap-2"
            >
              <Icon name="delete_forever" size={20} /> Excluir conta
            </button>
          ) : (
            <div className="rounded-xl border border-error/50 bg-error-container/20 p-4 space-y-3">
              <p className="text-body-md font-body-md text-on-error-container font-semibold">
                Tem certeza? Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmando(false)}
                  disabled={excluindo}
                  className="flex-1 h-12 rounded-xl border border-outline-variant/60 text-label-lg font-label-lg text-on-surface disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluir}
                  disabled={excluindo}
                  className="flex-1 h-12 rounded-xl bg-error text-on-error text-label-lg font-label-lg disabled:opacity-50"
                >
                  {excluindo ? "Excluindo…" : "Sim, excluir"}
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="text-body-sm font-body-sm text-on-surface-variant/70 text-center px-2">
          Seus dados de saúde são sensíveis e protegidos pela LGPD.
        </p>
      </main>
    </>
  );
}
