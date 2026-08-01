"use client";

import Link from "next/link";
import { Avatar } from "@/components/brand/Avatar";
import { Icon } from "@/components/brand/Icon";
import { ErrorState, Loading, StatusPill } from "@/components/brand/ui";
import {
  dayNum,
  monthShort,
  specialtyIcon,
  timeLabel,
  usePatient,
  weekdayLabel,
  type Appt,
} from "@/lib/patient-data";

const SPECIALTY_BLURB: Record<string, string> = {
  tricologia: "Diagnóstico e tratamento para saúde capilar avançada.",
  dermatologia: "Cuidado especializado para a saúde e estética da sua pele.",
  "clinica-geral": "Avaliação e acompanhamento da sua saúde global.",
};

const QUICK_ACTIONS = [
  { href: "/paciente/exames", icon: "description", label: "Meus\nExames", className: "bg-primary-container text-on-primary-container", iconClass: "text-primary-fixed-dim" },
  { href: "/paciente/exames", icon: "prescriptions", label: "Receitas\nMédicas", className: "bg-surface-container-high text-primary", iconClass: "text-secondary" },
  { href: "/paciente/perfil", icon: "payments", label: "Financeiro\n& Notas", className: "bg-surface-container-lowest border border-outline-variant/50 brand-shadow text-primary", iconClass: "text-on-tertiary-container" },
  { href: "/paciente/consultas", icon: "history_edu", label: "Histórico\nClínico", className: "bg-secondary-container/30 text-primary", iconClass: "text-secondary" },
];

export default function InicioPage() {
  const { data, error, reload } = usePatient();

  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  const firstName = data.name.split(" ")[0];

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md flex justify-between items-center w-full px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={data.name} />
          <div className="flex flex-col">
            <h1 className="text-headline-sm font-headline-sm text-primary">Olá, {firstName} 👋</h1>
            <p className="text-label-md font-label-md text-on-surface-variant">Como podemos ajudar você hoje?</p>
          </div>
        </div>
        <Link
          href="/paciente/urgencia"
          aria-label="Atendimento de urgência"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-error-container hover:opacity-90 transition-opacity"
        >
          <Icon name="bolt" filled className="text-error" />
        </Link>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 pt-4 space-y-8">
        <section className="relative overflow-hidden rounded-xl bg-secondary-container p-6 flex flex-col md:flex-row items-center justify-between brand-shadow border border-secondary-fixed/30">
          <div className="z-10 flex-1 space-y-4">
            <h2 className="text-headline-md font-headline-md text-on-secondary-container">Agende sua consulta</h2>
            <p className="text-body-md font-body-md text-on-secondary-container/80 max-w-xs">
              Escolha a especialidade e o melhor horário para seu atendimento exclusivo.
            </p>
            <Link
              href="/paciente/agendar"
              className="sd-aurora inline-block px-8 py-3 rounded-full text-label-lg font-label-lg hover:opacity-90 active:scale-95 transition-all shadow-md"
            >
              AGENDAR
            </Link>
          </div>
          <div className="hidden md:block relative w-48 h-48">
            <Icon name="calendar_month" className="text-primary/10 absolute -right-8 -bottom-8" size={160} />
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-headline-sm font-headline-sm text-primary">Especialidades</h3>
            <Link href="/paciente/agendar" className="text-label-lg font-label-lg text-secondary flex items-center gap-1">
              Ver todas <Icon name="chevron_right" size={18} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {data.specialties.map((s) => (
              <Link
                key={s.slug}
                href={`/paciente/agendar?especialidade=${s.slug}`}
                className="min-w-[160px] flex-1 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/50 brand-shadow hover:border-secondary transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center mb-4 group-hover:bg-secondary-container transition-colors">
                  <Icon name={specialtyIcon(s.slug)} className="text-primary group-hover:text-secondary transition-colors" />
                </div>
                <h4 className="text-label-lg font-label-lg text-primary mb-1">{s.name}</h4>
                <p className="text-[11px] leading-tight text-on-surface-variant font-label-md">
                  {SPECIALTY_BLURB[s.slug] ?? "Atendimento especializado com a equipe do Instituto."}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-headline-sm font-headline-sm text-primary">Próximas consultas</h3>
          {data.upcoming.length > 0 ? (
            <div className="space-y-3">
              {data.upcoming.slice(0, 3).map((a) => (
                <NextApptCard key={a.id} appt={a} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/50 brand-shadow text-center space-y-3">
              <Icon name="event_available" className="text-on-tertiary-container mx-auto" size={32} />
              <p className="text-body-md font-body-md text-on-surface-variant">Você não tem consultas agendadas.</p>
              <Link href="/paciente/agendar" className="inline-block text-label-lg font-label-lg text-secondary">
                Agendar agora →
              </Link>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} href={a.href} className={`p-5 rounded-xl flex flex-col justify-between aspect-square ${a.className}`}>
              <Icon name={a.icon} className={a.iconClass} size={32} />
              <span className="text-label-lg font-label-lg whitespace-pre-line">{a.label}</span>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}

function NextApptCard({ appt }: { appt: Appt }) {
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
        <h4 className="text-label-lg font-label-lg text-primary truncate">Consulta de {appt.especialidade}</h4>
        <div className="flex items-center gap-1 text-on-surface-variant text-body-sm font-body-sm">
          <Icon name="schedule" size={16} />
          <span className="capitalize truncate">
            {weekdayLabel(appt.startsAt)} • {timeLabel(appt.startsAt)}
          </span>
        </div>
        <p className="text-body-sm font-body-sm text-on-surface-variant truncate">{appt.medico}</p>
      </div>
      <StatusPill status={appt.status} />
    </Link>
  );
}
