"use client";

import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { EmptyState, ErrorState, Loading, StatusPill } from "@/components/brand/ui";
import { dayNum, money, monthShort, timeLabel, usePatient, type Appt } from "@/lib/patient-data";

export default function ConsultasPage() {
  const { data, error, reload } = usePatient();

  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  const empty = data.upcoming.length === 0 && data.past.length === 0;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md flex justify-between items-center w-full px-5 py-4">
        <h1 className="text-headline-sm font-headline-sm text-primary">Consultas</h1>
        <Link
          href="/paciente/agendar"
          className="flex items-center gap-1 text-label-lg font-label-lg text-secondary"
        >
          <Icon name="add" size={18} /> Agendar
        </Link>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 pt-2 space-y-8">
        {empty ? (
          <EmptyState
            icon="event_busy"
            title="Nenhuma consulta por aqui."
            hint="Agende uma avaliação ou fale com a Clara para encontrar o especialista certo."
          />
        ) : (
          <>
            {data.upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">Próximas</h2>
                {data.upcoming.map((a) => (
                  <ApptRow key={a.id} appt={a} />
                ))}
              </section>
            )}
            {data.past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">Realizadas</h2>
                {data.past.map((a) => (
                  <ApptRow key={a.id} appt={a} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function ApptRow({ appt }: { appt: Appt }) {
  return (
    <Link
      href={`/paciente/consultas/${appt.id}`}
      className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/50 brand-shadow"
    >
      <div className="flex flex-col items-center justify-center w-16 h-16 bg-surface-container rounded-lg border border-outline-variant/30 shrink-0">
        <span className="text-headline-sm font-headline-sm text-primary">{dayNum(appt.startsAt)}</span>
        <span className="text-label-md font-label-md text-on-surface-variant tracking-widest">{monthShort(appt.startsAt)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-label-lg font-label-lg text-primary truncate">{appt.especialidade}</h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant truncate">{appt.medico}</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          {timeLabel(appt.startsAt)} • {money(appt.priceCents)}
        </p>
      </div>
      <StatusPill status={appt.status} />
    </Link>
  );
}
