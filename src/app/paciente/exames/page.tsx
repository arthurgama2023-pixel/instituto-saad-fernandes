"use client";

import { Icon } from "@/components/brand/Icon";
import { EmptyState, ErrorState, Loading } from "@/components/brand/ui";
import { usePatient } from "@/lib/patient-data";

export default function ExamesPage() {
  const { data, error, reload } = usePatient();

  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full px-5 py-4">
        <h1 className="text-headline-sm font-headline-sm text-primary">Exames e documentos</h1>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 pt-2 space-y-8">
        <section className="space-y-3">
          <h2 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">Receitas</h2>
          {data.past.length > 0 ? (
            data.past.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/50 brand-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <Icon name="prescriptions" className="text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label-lg font-label-lg text-primary truncate">
                    {a.receituarioEspecial ? "Receituário especial" : "Receita"} — {a.especialidade}
                  </p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant truncate">
                    {a.medico} · {new Date(a.startsAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {a.assinaturaIcpStatus === "ASSINADO" ? (
                  <a
                    href={`/api/paciente/receituario/${a.id}`}
                    className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold flex items-center gap-1 shrink-0"
                    title="Baixar PDF assinado"
                  >
                    <Icon name="download" size={13} /> ASSINADA
                  </a>
                ) : a.assinaturaIcpStatus === "AGUARDANDO_ASSINATURA" ? (
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <Icon name="hourglass_top" size={13} /> AGUARDANDO
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full border border-outline-variant text-[11px] font-bold text-on-surface-variant shrink-0">
                    PDF
                  </span>
                )}
              </div>
            ))
          ) : (
            <EmptyState icon="prescriptions" title="Nenhuma receita ainda." hint="Suas receitas aparecem aqui após cada consulta." />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">Exames</h2>
          <EmptyState icon="labs" title="Nenhum exame anexado." hint="Resultados enviados pela clínica aparecem aqui." />
        </section>
      </main>
    </>
  );
}
