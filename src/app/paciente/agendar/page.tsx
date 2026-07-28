"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { ErrorState, Loading, PageHeader } from "@/components/brand/ui";
import { specialtyIcon, usePatient } from "@/lib/patient-data";

const BLURB: Record<string, string> = {
  tricologia: "Diagnóstico e tratamento de doenças do cabelo e couro cabeludo.",
  dermatologia: "Cuidado da pele: lesões, acne, manchas e estética.",
  "clinica-geral": "Avaliação geral da sua saúde, prevenção e tratamento.",
};

const STEPS = ["Especialidade", "Data e horário", "Pagamento"];

function AgendarFlow() {
  const router = useRouter();
  const preset = useSearchParams().get("especialidade");
  const { data, error, reload } = usePatient();
  const [selected, setSelected] = useState<string | null>(preset);

  // A pré-seleção via querystring só vale quando a especialidade existe de fato.
  useEffect(() => {
    if (!data || !preset) return;
    if (!data.specialties.some((s) => s.slug === preset)) setSelected(null);
  }, [data, preset]);

  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  const chosen = data.specialties.find((s) => s.slug === selected);

  const continuar = () => {
    if (!chosen) return;
    router.push(`/paciente/mensagens?intencao=${encodeURIComponent(`Quero marcar uma consulta de ${chosen.name}`)}`);
  };

  return (
    <>
      <PageHeader title="Agendar consulta" />

      <main className="w-full max-w-[560px] mx-auto px-5 pb-32">
        <section className="py-6 mb-8">
          <div className="flex justify-between items-start">
            {STEPS.map((label, i) => (
              <div key={label} className="contents">
                {i > 0 && <div className="flex-grow h-[2px] bg-outline-variant mx-2 mt-4" />}
                <div className="flex flex-col items-center gap-2 w-20 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-md ${
                      i === 0
                        ? "bg-primary-container text-white shadow-[0_0_0_4px_rgba(12,28,49,0.1)]"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-label-md font-label-md text-center ${
                      i === 0 ? "text-primary" : "text-on-tertiary-container"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-headline-md font-headline-md text-primary mb-2">Escolha a especialidade</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Selecione o tipo de atendimento que você deseja realizar.
          </p>
        </section>

        <section className="space-y-4">
          {data.specialties.map((s) => {
            const active = s.slug === selected;
            return (
              <button
                key={s.slug}
                onClick={() => setSelected(s.slug)}
                aria-pressed={active}
                className={`w-full text-left block rounded-xl p-5 border transition-all ${
                  active
                    ? "border-secondary bg-surface-container-low"
                    : "border-outline-variant bg-surface-container-lowest hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      active ? "bg-primary-container text-white" : "bg-surface-container-low text-primary"
                    }`}
                  >
                    <Icon name={specialtyIcon(s.slug)} size={28} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="text-body-lg font-bold text-primary mb-1">{s.name}</h3>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                      {BLURB[s.slug] ?? "Atendimento especializado com a equipe do Instituto."}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      active ? "border-secondary bg-secondary opacity-100" : "border-outline-variant opacity-0"
                    }`}
                  >
                    <Icon name="check" className="text-white font-bold" size={16} />
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="mt-8 p-6 bg-surface-container-low rounded-xl">
          <h4 className="text-label-lg font-label-lg text-primary mb-4 flex items-center gap-2">
            <Icon name="info" size={20} />
            Sobre as consultas
          </h4>
          <ul className="space-y-3">
            {[
              "Atendimento presencial ou por teleconsulta",
              "Consultas particulares com emissão de nota",
              "Retorno incluso em até 30 dias",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <Icon name="check_circle" className="text-secondary" size={18} />
                <span className="text-body-sm font-body-sm text-on-surface-variant">{t}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant px-5 py-6 z-50 flex justify-center shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
        <button
          onClick={continuar}
          disabled={!chosen}
          className="w-full max-w-[390px] h-14 bg-primary-container text-white text-label-lg font-label-lg rounded-xl hover:bg-primary transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg"
        >
          CONTINUAR
          <Icon name="arrow_forward" />
        </button>
      </footer>
    </>
  );
}

export default function AgendarPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AgendarFlow />
    </Suspense>
  );
}
