import Link from "next/link";
import { ensureDemoData } from "@/modules/demo/seed-demo";
import { doctorPanel, listDoctors, getDefaultDoctorId } from "@/modules/doctor/service";
import { getDoctorSession } from "@/lib/doctor-session";
import { DoctorSwitcher } from "@/components/PanelSwitcher";
import { LogoMark } from "@/components/LogoMark";
import { UrgencyInbox } from "@/components/UrgencyInbox";
import { Icon } from "@/components/brand/Icon";
import { CertificadoUploader } from "./CertificadoUploader";
import { PerfilEditor } from "./PerfilEditor";

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dateLabel = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const initials = (n: string) => n.replace(/^(dra?\.?)\s+/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const NAV: [string, string, string][] = [
  ["dashboard", "dashboard", "Dashboard"],
  ["agenda", "calendar_month", "Agenda"],
  ["pacientes", "group", "Pacientes"],
  ["financeiro", "account_balance_wallet", "Financeiro"],
  ["config", "person", "Meu perfil"],
];

const card = "bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow";

export default async function MedicoPanel({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; tab?: string }>;
}) {
  await ensureDemoData();
  const sp = await searchParams;
  const doctors = await listDoctors();
  // Prioridade: seletor da URL (?d=) → médico logado por OTP (cookie) → padrão demo.
  const doctorId = sp.d || (await getDoctorSession()) || (await getDefaultDoctorId()) || "";
  const tab = sp.tab || "dashboard";
  const data = await doctorPanel(doctorId);

  if (!data)
    return (
      <div className="brand-app min-h-screen flex items-center justify-center bg-background text-on-surface-variant">
        Médico não encontrado.
      </div>
    );
  const qs = (t: string) => `/medico?d=${doctorId}&tab=${t}`;

  return (
    <div className="brand-app min-h-screen flex bg-background text-on-background">
      <aside className="w-64 shrink-0 border-r border-outline-variant/50 bg-surface-container-lowest flex-col p-4 gap-1 sticky top-0 h-screen hidden md:flex">
        <Link href="/" className="flex items-center gap-3 px-2 py-2 mb-4">
          <LogoMark size={40} />
          <span className="flex flex-col leading-tight">
            <span className="text-label-lg font-label-lg text-primary">Smart Doctor</span>
            <span className="text-[11px] text-on-surface-variant font-label-md">Painel do médico</span>
          </span>
        </Link>

        {NAV.map(([id, ic, label]) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={qs(id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-label-lg font-label-lg transition-colors ${
                active
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <Icon name={ic} filled={active} size={22} />
              {label}
            </Link>
          );
        })}

        <div className="mt-auto pt-4 border-t border-outline-variant/50">
          <div className="text-label-lg font-label-lg text-primary">{data.doctor.name}</div>
          <div className="text-body-sm font-body-sm text-on-surface-variant">
            {data.doctor.specialty} · {data.doctor.crm}
          </div>
          <Link href="/" className="inline-flex items-center gap-1 mt-2 text-body-sm font-body-sm text-secondary font-semibold">
            <Icon name="arrow_back" size={16} /> Trocar de perfil
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-5 md:px-8 py-6 max-w-[1200px]">
        <header className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-headline-md font-headline-md text-primary">{tabTitle(tab)}</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              Bom dia, {data.doctor.name.split(" ").slice(0, 2).join(" ")} ☀️
            </p>
          </div>
          <DoctorSwitcher doctors={doctors} current={doctorId} tab={tab} />
        </header>

        {tab === "dashboard" && (
          <div className="space-y-8">
            <UrgencyInbox doctorId={doctorId} />
            <Dashboard data={data} />
          </div>
        )}
        {tab === "agenda" && <AgendaView data={data} />}
        {tab === "pacientes" && <Pacientes data={data} />}
        {tab === "financeiro" && <Financeiro data={data} />}
        {tab === "config" && <Config />}
      </main>
    </div>
  );
}

function tabTitle(t: string) {
  return { dashboard: "Dashboard", agenda: "Agenda", pacientes: "Pacientes", financeiro: "Financeiro", config: "Meu perfil" }[t] ?? "Painel";
}

type Data = NonNullable<Awaited<ReturnType<typeof doctorPanel>>>;

function Kpi({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center gap-2 text-on-surface-variant mb-3">
        <Icon name={icon} size={20} />
        <span className="text-label-md font-label-md">{label}</span>
      </div>
      <div className="text-headline-md font-headline-md text-primary">{value}</div>
      {hint && <div className="text-body-sm font-body-sm text-on-surface-variant mt-1">{hint}</div>}
    </div>
  );
}

function Dashboard({ data }: { data: Data }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon="event" label="Consultas hoje" value={String(data.kpis.consultasHoje)} hint="agendadas para hoje" />
        <Kpi icon="account_balance_wallet" label="Faturamento (mês)" value={money(data.kpis.faturamentoMesCents)} hint="líquido, após taxa" />
        <Kpi icon="star" label="Avaliação" value={`★ ${data.kpis.rating.toFixed(1)}`} hint="média dos pacientes" />
        <Kpi icon="donut_large" label="Ocupação hoje" value={data.kpis.ocupacao != null ? `${data.kpis.ocupacao}%` : "—"} hint="da agenda do dia" />
      </div>

      {data.proximo && (
        <section className="mt-8 rounded-xl border border-secondary-fixed/40 bg-secondary-container/40 p-6 brand-shadow">
          <div className="flex items-center gap-2 text-secondary text-label-md font-label-md tracking-widest">
            <Icon name="schedule" size={18} /> PRÓXIMO PACIENTE · {timeLabel(data.proximo.startsAt)}
          </div>
          <h2 className="text-headline-sm font-headline-sm text-primary mt-2">
            {data.proximo.patient}
            {data.proximo.primeira ? " · 1ª consulta" : ""}
          </h2>
          <div className="mt-4 rounded-lg bg-surface-container-lowest/70 border border-outline-variant/40 p-4">
            <span className="inline-flex items-center gap-2 text-label-md font-label-md text-secondary mb-1">
              <span className="w-2.5 h-2.5 rounded-full sd-aurora" /> Resumo da Clara
            </span>
            <p className="text-body-md font-body-md text-on-surface-variant">
              {data.proximo.primeira
                ? "Primeira consulta. Paciente chegou pela triagem da Clara no WhatsApp. Sem histórico prévio na plataforma."
                : "Paciente recorrente. Consulte o prontuário para o histórico das sessões anteriores."}
            </p>
          </div>
          <Link
            href={`/sala/${data.proximo.id}?como=medico&d=${data.doctor.id}&peer=${encodeURIComponent(data.proximo.patient)}`}
            className="sd-aurora mt-5 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-label-lg font-label-lg active:scale-95 transition-transform shadow-md"
          >
            <Icon name="videocam" size={20} /> Entrar na sala
          </Link>
        </section>
      )}

      <section className="mt-8 space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-headline-sm font-headline-sm text-primary">Agenda de hoje</h3>
          <span className="text-body-sm font-body-sm text-on-surface-variant">{data.todayAppts.length} consulta(s)</span>
        </div>
        <TimelineList data={data} />
      </section>
    </>
  );
}

function ApptStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    CONCLUIDA: { label: "Concluída", className: "bg-surface-container border-outline-variant text-on-surface-variant" },
    AGUARDANDO_PAGAMENTO: { label: "Aguardando", className: "bg-secondary-container/50 border-secondary-fixed-dim text-on-secondary-container" },
  };
  const pill = map[status] ?? { label: "Confirmada", className: "bg-green-50 border-green-200 text-green-700" };
  return <span className={`px-3 py-1 rounded-full border text-[11px] font-bold shrink-0 ${pill.className}`}>{pill.label}</span>;
}

function TimelineList({ data }: { data: Data }) {
  if (data.todayAppts.length === 0) {
    return (
      <div className={`${card} flex flex-col items-center gap-2 py-12 text-center`}>
        <Icon name="event_available" className="text-on-tertiary-container" size={32} />
        <p className="text-body-md font-body-md text-on-surface-variant">Nenhuma consulta hoje.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {data.todayAppts.map((a) => (
        <div key={a.id} className={`${card} flex items-center gap-4 p-4 ${a.status === "CONCLUIDA" ? "opacity-70" : ""}`}>
          <div className="flex flex-col items-center justify-center w-14 shrink-0">
            <span className="text-label-lg font-label-lg text-primary">{timeLabel(a.startsAt)}</span>
          </div>
          <span className="w-1 self-stretch rounded-full sd-aurora shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-label-lg font-label-lg text-primary truncate">{a.patient}</div>
            <div className="flex items-center gap-1 text-body-sm font-body-sm text-on-surface-variant">
              <Icon name="videocam" size={16} /> Teleconsulta · {money(a.priceCents)}
            </div>
          </div>
          <ApptStatusPill status={a.status} />
        </div>
      ))}
    </div>
  );
}

function AgendaView({ data }: { data: Data }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-headline-sm font-headline-sm text-primary">Hoje</h3>
        <span className="text-body-sm font-body-sm text-on-surface-variant capitalize">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </span>
      </div>
      <TimelineList data={data} />
    </section>
  );
}

function Pacientes({ data }: { data: Data }) {
  if (data.patients.length === 0) {
    return (
      <div className={`${card} flex flex-col items-center gap-2 py-12 text-center`}>
        <Icon name="group" className="text-on-tertiary-container" size={32} />
        <p className="text-body-md font-body-md text-on-surface-variant">Nenhum paciente ainda.</p>
      </div>
    );
  }
  return (
    <section className="space-y-3">
      <h3 className="text-headline-sm font-headline-sm text-primary mb-1">
        Meus pacientes <span className="text-body-sm font-body-sm text-on-surface-variant">· {data.patients.length}</span>
      </h3>
      {data.patients.map((p) => (
        <div key={p.id} className={`${card} flex items-center gap-4 p-4`}>
          <span className="w-11 h-11 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-label-md font-label-md shrink-0">
            {initials(p.name)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-label-lg font-label-lg text-primary truncate">{p.name}</div>
            <div className="text-body-sm font-body-sm text-on-surface-variant">
              {p.total} consulta(s) · última {dateLabel(p.last)}
            </div>
          </div>
          <Link
            href={`/medico/pacientes/${p.id}?d=${data.doctor.id}`}
            className="h-10 px-4 rounded-full bg-surface-container text-primary text-label-md font-label-md hover:bg-surface-container-high transition-colors shrink-0 flex items-center"
          >
            Prontuário
          </Link>
        </div>
      ))}
    </section>
  );
}

function Financeiro({ data }: { data: Data }) {
  const totalNet = data.payments.filter((p) => p.status === "CONFIRMED").reduce((s, p) => s + p.netCents, 0);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon="payments" label="Recebido (líquido)" value={money(totalNet)} />
        <Kpi icon="task_alt" label="Consultas pagas" value={String(data.payments.filter((p) => p.status === "CONFIRMED").length)} />
        <Kpi icon="percent" label="Taxa da plataforma" value="15%" hint="repasse D+2" />
      </div>

      <section className="space-y-3">
        <h3 className="text-headline-sm font-headline-sm text-primary mb-1">Extrato por consulta</h3>
        {data.payments.length === 0 ? (
          <div className={`${card} py-12 text-center text-body-md font-body-md text-on-surface-variant`}>Sem lançamentos ainda.</div>
        ) : (
          data.payments.map((p) => (
            <div key={p.id} className={`${card} flex items-center gap-4 p-4`}>
              <div className="flex-1 min-w-0">
                <div className="text-label-lg font-label-lg text-primary truncate">{p.patient}</div>
                <div className="text-body-sm font-body-sm text-on-surface-variant">
                  {dateLabel(p.date)} · bruto {money(p.grossCents)} · taxa −{money(p.feeCents)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-label-lg font-label-lg text-primary">{money(p.netCents)}</div>
                {p.status === "CONFIRMED" ? (
                  <span className="text-[11px] font-bold text-green-700">Repassado</span>
                ) : (
                  <span className="text-[11px] font-bold text-on-secondary-container">Pendente</span>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Config() {
  return (
    <div className="space-y-8">
      <PerfilEditor />
      <CertificadoUploader />
    </div>
  );
}
