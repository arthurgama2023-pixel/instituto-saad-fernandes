"use client";

import { use } from "react";
import Link from "next/link";
import { Avatar } from "@/components/brand/Avatar";
import { Icon } from "@/components/brand/Icon";
import { CallCard } from "@/components/brand/CallCard";
import { ErrorState, Loading, PageHeader, StatusPill } from "@/components/brand/ui";
import { dayNum, money, monthShort, timeLabel, usePatient, weekdayLabel } from "@/lib/patient-data";

export default function ProntuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, reload } = usePatient();

  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  const appt = [...data.upcoming, ...data.past].find((a) => a.id === id);
  if (!appt) {
    return (
      <>
        <PageHeader title="Prontuário" />
        <main className="px-5 py-10 text-center text-body-md font-body-md text-on-surface-variant">
          Consulta não encontrada.
        </main>
      </>
    );
  }

  const realizada = appt.status === "CONCLUIDA";

  return (
    <>
      <PageHeader title="Prontuário" />

      <main className="max-w-[1200px] mx-auto px-5 pb-6 space-y-6">
        {appt.status === "CONFIRMADA" && (
          <CallCard
            call={{
              id: appt.id,
              startsAt: appt.startsAt,
              medico: appt.medico,
              especialidade: appt.especialidade,
              mode: appt.mode,
              durationMin: appt.durationMin,
            }}
          />
        )}

        <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 brand-shadow flex flex-col md:flex-row md:items-center gap-6">
          <Avatar name={data.name} size={80} />
          <div className="flex-1">
            <h2 className="text-headline-md font-headline-md text-primary mb-1">{data.name}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {data.phone && (
                <p className="text-label-lg font-label-lg text-on-surface-variant flex items-center gap-2">
                  <Icon name="call" size={18} /> {data.phone}
                </p>
              )}
              <p className="text-label-lg font-label-lg text-on-surface-variant flex items-center gap-2">
                <Icon name="schedule" size={18} /> {appt.durationMin} min
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <StatusPill status={appt.status} />
            <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-label-md font-label-md">
              {appt.especialidade}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-8 space-y-6">
            <article className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/20 brand-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-container rounded-lg">
                  <Icon name="description" className="text-white" size={20} />
                </div>
                <h3 className="text-headline-sm font-headline-sm text-primary">Resumo clínico</h3>
              </div>
              <p className="text-body-lg font-body-lg text-on-surface-variant leading-relaxed whitespace-pre-line">
                {appt.resumoClinico ||
                  (realizada
                    ? "O médico ainda não registrou o resumo desta consulta. Assim que for preenchido, ele aparece aqui."
                    : "O resumo clínico fica disponível depois que a consulta for realizada.")}
              </p>
            </article>

            <article className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/20 brand-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-container rounded-lg">
                  <Icon name="medical_services" className="text-white" size={20} />
                </div>
                <h3 className="text-headline-sm font-headline-sm text-primary">Condutas &amp; recomendações</h3>
              </div>
              <p className="text-body-md font-body-md text-on-surface-variant whitespace-pre-line">
                {appt.condutas || "Nenhuma conduta registrada para esta consulta."}
              </p>
            </article>
          </div>

          <div className="md:col-span-4 space-y-6">
            <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 brand-shadow">
              <h4 className="text-label-lg font-label-lg text-primary uppercase tracking-wider mb-4">
                {realizada ? "Consulta realizada" : "Consulta agendada"}
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-primary-container text-white w-14 h-14 rounded-lg shrink-0">
                  <span className="text-[10px] font-bold">{monthShort(appt.startsAt)}</span>
                  <span className="text-xl font-bold">{dayNum(appt.startsAt)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-label-lg font-label-lg text-primary capitalize truncate">{weekdayLabel(appt.startsAt)}</p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    {timeLabel(appt.startsAt)} • {appt.mode === "VIDEO" ? "Teleconsulta" : "Presencial"}
                  </p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">{money(appt.priceCents)}</p>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 brand-shadow">
              <h4 className="text-label-lg font-label-lg text-primary uppercase tracking-wider mb-4">Responsável técnico</h4>
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={appt.medico} size={48} />
                <div className="min-w-0">
                  <p className="text-label-lg font-label-lg text-primary truncate">{appt.medico}</p>
                  <p className="text-label-md font-label-md text-on-surface-variant">{appt.medicoCrm}</p>
                </div>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant">{appt.medicoBio}</p>
            </section>

            <section className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/20">
              <h4 className="text-label-lg font-label-lg text-primary uppercase tracking-wider mb-4">Alergias</h4>
              <div className="flex items-center gap-2">
                <Icon name="error" className="text-error" size={20} />
                <p className="text-body-md font-body-md text-on-surface-variant">Não informado</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
