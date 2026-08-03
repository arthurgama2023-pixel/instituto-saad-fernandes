import Link from "next/link";
import { ensureDemoData } from "@/modules/demo/seed-demo";
import { doctorPanel, listDoctors, getDefaultDoctorId } from "@/modules/doctor/service";
import { getDoctorSession } from "@/lib/doctor-session";
import { DoctorSwitcher } from "@/components/PanelSwitcher";
import { SPulse } from "@/components/SPulse";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UrgencyInbox } from "@/components/UrgencyInbox";

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dateLabel = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const initials = (n: string) => n.replace(/^(dra?\.?)\s+/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const NAV: [string, string, string][] = [
  ["dashboard", "⌂", "Dashboard"],
  ["agenda", "📅", "Agenda"],
  ["pacientes", "👥", "Pacientes"],
  ["financeiro", "💰", "Financeiro"],
  ["config", "⚙", "Configurações"],
];

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

  if (!data) return <div className="main">Médico não encontrado.</div>;
  const qs = (t: string) => `/medico?d=${doctorId}&tab=${t}`;

  return (
    <div className="panel">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <div className="m"><SPulse /></div>
          <div className="t">Smart Doctor<small>Painel do médico</small></div>
        </Link>
        {NAV.map(([id, ic, label]) => (
          <Link key={id} href={qs(id)} className={`nav-link ${tab === id ? "active" : ""}`}>
            <span className="ic">{ic}</span>{label}
          </Link>
        ))}
        <div className="foot">
          <div className="who">{data.doctor.name}</div>
          <div className="role">{data.doctor.specialtyIcon} {data.doctor.specialty} · {data.doctor.crm}</div>
          <Link href="/" style={{ display: "inline-block", marginTop: 6 }}>← Trocar de perfil</Link>
        </div>
      </aside>

      <main className="main">
        <div className="main-head">
          <div>
            <h1>{tabTitle(tab)}</h1>
            <span className="sub">Bom dia, {data.doctor.name.split(" ").slice(0, 2).join(" ")} ☀️</span>
          </div>
          <div className="spacer" />
          <DoctorSwitcher doctors={doctors} current={doctorId} tab={tab} />
          <ThemeToggle />
        </div>

        {tab === "dashboard" && (
          <>
            <UrgencyInbox doctorId={doctorId} />
            <Dashboard data={data} />
          </>
        )}
        {tab === "agenda" && <AgendaView data={data} />}
        {tab === "pacientes" && <Pacientes data={data} />}
        {tab === "financeiro" && <Financeiro data={data} />}
        {tab === "config" && <Config data={data} />}
      </main>
    </div>
  );
}

function tabTitle(t: string) {
  return { dashboard: "Dashboard", agenda: "Agenda", pacientes: "Pacientes", financeiro: "Financeiro", config: "Configurações" }[t] ?? "Painel";
}

type Data = NonNullable<Awaited<ReturnType<typeof doctorPanel>>>;

function Dashboard({ data }: { data: Data }) {
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><div className="lbl">Consultas hoje</div><div className="val">{data.kpis.consultasHoje}</div><div className="delta">agendadas para hoje</div></div>
        <div className="kpi"><div className="lbl">Faturamento (mês)</div><div className="val">{money(data.kpis.faturamentoMesCents)}</div><div className="delta up">líquido, após taxa</div></div>
        <div className="kpi"><div className="lbl">Avaliação</div><div className="val">★ {data.kpis.rating.toFixed(1)}</div><div className="delta">média dos pacientes</div></div>
        <div className="kpi"><div className="lbl">Ocupação hoje</div><div className="val">{data.kpis.ocupacao != null ? `${data.kpis.ocupacao}%` : "—"}</div><div className="delta">da agenda do dia</div></div>
      </div>

      {data.proximo && (
        <div className="next-patient">
          <div className="lbl">PRÓXIMO PACIENTE · {timeLabel(data.proximo.startsAt)}</div>
          <div className="name">{data.proximo.patient}{data.proximo.primeira ? " · 1ª consulta" : ""}</div>
          <div className="clara-note">
            <span className="tag"><span className="dot" /> Resumo da Clara</span><br />
            {data.proximo.primeira
              ? "Primeira consulta. Paciente chegou pela triagem da Clara no WhatsApp. Sem histórico prévio na plataforma."
              : "Paciente recorrente. Consulte o prontuário para o histórico das sessões anteriores."}
          </div>
          <button className="btn-sm primary">Entrar na sala</button>
        </div>
      )}

      <div className="block">
        <h3>Agenda de hoje <span className="count">{data.todayAppts.length} consulta(s)</span></h3>
        <TimelineList data={data} />
      </div>
    </>
  );
}

function TimelineList({ data }: { data: Data }) {
  if (data.todayAppts.length === 0) return <div className="empty" style={{ padding: 24 }}>Nenhuma consulta hoje.</div>;
  return (
    <div className="timeline">
      {data.todayAppts.map((a) => (
        <div className={`tl-row ${a.status === "CONCLUIDA" ? "done" : ""}`} key={a.id}>
          <div className="time">{timeLabel(a.startsAt)}</div>
          <div className="bar" />
          <div className="who">
            <div className="n">{a.patient}</div>
            <div className="s">Teleconsulta 📹 · {money(a.priceCents)}</div>
          </div>
          {a.status === "CONCLUIDA" ? <span className="pill done">Concluída</span>
            : a.status === "AGUARDANDO_PAGAMENTO" ? <span className="pill wait">Aguardando</span>
            : <span className="pill ok">Confirmada</span>}
        </div>
      ))}
    </div>
  );
}

function AgendaView({ data }: { data: Data }) {
  return (
    <div className="block">
      <h3>Hoje <span className="count">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span></h3>
      <TimelineList data={data} />
    </div>
  );
}

function Pacientes({ data }: { data: Data }) {
  return (
    <div className="block">
      <h3>Meus pacientes <span className="count">{data.patients.length}</span></h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Paciente</th><th className="num">Consultas</th><th>Última</th><th></th></tr></thead>
          <tbody>
            {data.patients.map((p) => (
              <tr key={p.name}>
                <td className="name-cell"><span className="tbl-ava">{initials(p.name)}</span>{p.name}</td>
                <td className="num">{p.total}</td>
                <td>{dateLabel(p.last)}</td>
                <td className="num"><button className="btn-sm ghost">Prontuário</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Financeiro({ data }: { data: Data }) {
  const totalNet = data.payments.filter((p) => p.status === "CONFIRMED").reduce((s, p) => s + p.netCents, 0);
  return (
    <>
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi"><div className="lbl">Recebido (líquido)</div><div className="val">{money(totalNet)}</div></div>
        <div className="kpi"><div className="lbl">Consultas pagas</div><div className="val">{data.payments.filter((p) => p.status === "CONFIRMED").length}</div></div>
        <div className="kpi"><div className="lbl">Taxa da plataforma</div><div className="val">15%</div><div className="delta">repasse D+2</div></div>
      </div>
      <div className="block">
        <h3>Extrato por consulta</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Paciente</th><th>Data</th><th className="num">Bruto</th><th className="num">Taxa</th><th className="num">Líquido</th><th>Status</th></tr></thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td className="name-cell">{p.patient}</td>
                  <td>{dateLabel(p.date)}</td>
                  <td className="num">{money(p.grossCents)}</td>
                  <td className="num" style={{ color: "var(--text-3)" }}>−{money(p.feeCents)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{money(p.netCents)}</td>
                  <td>{p.status === "CONFIRMED" ? <span className="pill ok">Repassado</span> : <span className="pill wait">Pendente</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Config({ data }: { data: Data }) {
  return (
    <div className="block">
      <h3>Perfil público</h3>
      <div className="field-row"><span className="k">Nome</span><span className="v">{data.doctor.name}</span></div>
      <div className="field-row"><span className="k">Especialidade</span><span className="v">{data.doctor.specialtyIcon} {data.doctor.specialty}</span></div>
      <div className="field-row"><span className="k">CRM</span><span className="v">{data.doctor.crm}</span></div>
      <div className="field-row"><span className="k">Valor da consulta</span><span className="v">{money(data.doctor.priceCents)}</span></div>
      <div className="field-row"><span className="k">Clara no WhatsApp</span><span className="v" style={{ color: "var(--success)" }}>Ativa ✓</span></div>
    </div>
  );
}
