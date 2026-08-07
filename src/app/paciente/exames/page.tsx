"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { EmptyState, Loading } from "@/components/brand/ui";

type DocItem = {
  id: string;
  tipo: string;
  titulo: string;
  temTexto: boolean;
  arquivoNome: string | null;
  assinado: boolean;
  medico: string;
  emitidoEm: string;
  novo: boolean;
};

const ICONE: Record<string, string> = {
  RECEITA: "prescriptions",
  ATESTADO: "assignment",
  EXAME: "labs",
  OUTRO: "description",
};

export default function ExamesPage() {
  const [docs, setDocs] = useState<DocItem[] | null>(null);

  useEffect(() => {
    fetch("/api/paciente/documentos")
      .then((r) => r.json())
      .then((d) => setDocs(d.documentos ?? []))
      .catch(() => setDocs([]));
  }, []);

  if (!docs) return <Loading />;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full px-5 py-4">
        <h1 className="text-headline-sm font-headline-sm text-primary">Exames e documentos</h1>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 pt-2 pb-8 space-y-3">
        {docs.length === 0 ? (
          <EmptyState
            icon="description"
            title="Nenhum documento ainda."
            hint="Receitas, atestados e exames enviados pelo seu médico aparecem aqui."
          />
        ) : (
          docs.map((d) => (
            <Link
              key={d.id}
              href={`/paciente/exames/${d.id}`}
              className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/50 brand-shadow active:scale-[0.99] transition-transform"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                <Icon name={ICONE[d.tipo] ?? "description"} className="text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-label-lg font-label-lg text-primary truncate flex items-center gap-2">
                  {d.titulo}
                  {d.novo && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                      novo
                    </span>
                  )}
                </p>
                <p className="text-body-sm font-body-sm text-on-surface-variant truncate flex items-center gap-1">
                  {d.assinado && <Icon name="verified" filled size={14} className="text-secondary shrink-0" />}
                  {d.medico} · {new Date(d.emitidoEm).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {d.arquivoNome && (
                <span className="px-3 py-1 rounded-full border border-outline-variant text-[11px] font-bold text-on-surface-variant shrink-0">
                  PDF
                </span>
              )}
              <Icon name="chevron_right" className="text-on-surface-variant shrink-0" />
            </Link>
          ))
        )}
      </main>
    </>
  );
}
