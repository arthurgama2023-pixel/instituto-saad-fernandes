"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { Loading } from "@/components/brand/ui";

type Doc = {
  id: string;
  tipoLabel: string;
  titulo: string;
  conteudo: string;
  temArquivo: boolean;
  arquivoNome: string | null;
  paciente: string;
  medico: string;
  crm: string;
  especialidade: string;
  emitidoEm: string;
};

export default function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch(`/api/paciente/documentos/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDoc)
      .catch(() => setErro(true));
  }, [id]);

  if (erro) {
    return (
      <main className="max-w-[720px] mx-auto px-5 py-16 text-center space-y-4">
        <p className="text-body-md text-on-surface-variant">Documento não encontrado.</p>
        <Link href="/paciente/exames" className="text-secondary font-semibold">← Voltar</Link>
      </main>
    );
  }
  if (!doc) return <Loading />;

  return (
    <>
      {/* Cabeçalho de navegação — escondido na impressão */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full px-5 py-4 flex items-center gap-3 print:hidden">
        <Link href="/paciente/exames" aria-label="Voltar" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-low">
          <Icon name="arrow_back" className="text-primary" size={20} />
        </Link>
        <h1 className="text-headline-sm font-headline-sm text-primary">{doc.tipoLabel}</h1>
      </header>

      <main className="max-w-[720px] mx-auto px-5 pb-32 pt-2">
        {/* Folha do documento */}
        <article className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow p-6 sm:p-8 print:border-0 print:shadow-none">
          <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4 mb-4">
            <div className="flex items-center gap-2 text-secondary">
              <Icon name="local_hospital" filled size={22} />
              <span className="text-label-lg font-label-lg">Smart Doctor</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">
              {doc.tipoLabel}
            </span>
          </div>

          <h2 className="text-headline-sm font-headline-sm text-primary mb-1">{doc.titulo}</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant mb-6">
            Emitido em {new Date(doc.emitidoEm).toLocaleString("pt-BR")}
          </p>

          {doc.conteudo && (
            <div className="whitespace-pre-wrap text-body-md font-body-md text-on-surface leading-relaxed">
              {doc.conteudo}
            </div>
          )}

          {doc.temArquivo && (
            <a
              href={`/api/documentos/${doc.id}/arquivo`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-outline-variant text-primary text-label-lg font-label-lg hover:border-secondary transition-colors print:hidden"
            >
              <Icon name="attach_file" size={18} /> Abrir anexo{doc.arquivoNome ? ` (${doc.arquivoNome})` : ""}
            </a>
          )}

          <div className="mt-10 pt-6 border-t border-outline-variant/50 text-body-sm font-body-sm text-on-surface-variant">
            <p><strong className="text-on-surface">Paciente:</strong> {doc.paciente}</p>
            <p className="mt-3"><strong className="text-on-surface">{doc.medico}</strong></p>
            <p>{doc.especialidade} · {doc.crm}</p>
            <p className="mt-4 text-[11px] text-on-surface-variant/70">
              Documento emitido pelo app Smart Doctor (versão amostra, sem assinatura digital ICP-Brasil).
            </p>
          </div>
        </article>
      </main>

      {/* Ações fixas — escondidas na impressão */}
      <footer className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant px-5 py-5 z-50 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="sd-aurora w-full max-w-[390px] h-12 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
        >
          <Icon name="print" size={20} /> Imprimir / Salvar PDF
        </button>
      </footer>
    </>
  );
}
