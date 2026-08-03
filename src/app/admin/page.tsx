import Link from "next/link";
import { ensureDemoData } from "@/modules/demo/seed-demo";
import { adminOverview, listDoctorsAdmin } from "@/modules/admin/service";
import { LogoMark } from "@/components/LogoMark";
import { Icon } from "@/components/brand/Icon";

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const initials = (n: string) => n.replace(/^(dra?\.?)\s+/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const NAV: [string, string, string][] = [
  ["visao", "dashboard", "Visão geral"],
  ["medicos", "stethoscope", "Médicos"],
  ["clara", "auto_awesome", "Clara (IA)"],
  ["financeiro", "account_balance_wallet", "Financeiro"],
];

const card = "bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow";

export default async function AdminPanel({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await ensureDemoData();
  const sp = await searchParams;
  const tab = sp.tab || "visao";
  const overview = await adminOverview();
  const doctors = await listDoctorsAdmin();

  return (
    <div className="brand-app min-h-screen flex bg-background text-on-background">
      <aside className="w-64 shrink-0 border-r border-outline-variant/50 bg-surface-container-lowest flex-col p-4 gap-1 sticky top-0 h-screen hidden md:flex">
        <Link href="/" className="flex items-center gap-3 px-2 py-2 mb-4">
          <LogoMark size={40} />
          <span className="flex flex-col leading-tight">
            <span className="text-label-lg font-label-lg text-primary">Smart Doctor</span>
            <span className="text-[11px] text-on-surface-variant font-label-md">Administração</span>
          </span>
        </Link>

        {NAV.map(([id, ic, label]) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={`/admin?tab=${id}`}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-label-lg font-label-lg transition-colors ${
                active
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <Icon name={ic} filled={active} size={22} />
              <span className="flex-1">{label}</span>
              {id === "medicos" && overview.pendentes.length > 0 && (
                <span className="bg-error text-on-error text-[10px] font-bold rounded-full px-2 py-0.5">
                  {overview.pendentes.length}
                </span>
              )}
            </Link>
          );
        })}

        <div className="mt-auto pt-4 border-t border-outline-variant/50">
          <div className="text-label-lg font-label-lg text-primary">Paula Freitas</div>
          <div className="text-body-sm font-body-sm text-on-surface-variant">Administradora</div>
          <Link href="/" className="inline-flex items-center gap-1 mt-2 text-body-sm font-body-sm text-secondary font-semibold">
            <Icon name="arrow_back" size={16} /> Trocar de perfil
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-5 md:px-8 py-6 max-w-[1200px]">
        <header className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-headline-md font-headline-md text-primary">{tabTitle(tab)}</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">Smart Doctor · operação</p>
          </div>
        </header>

        {tab === "visao" && <Visao overview={overview} />}
        {tab === "medicos" && <Medicos overview={overview} doctors={doctors} />}
        {tab === "clara" && <ClaraAdmin overview={overview} />}
        {tab === "financeiro" && <FinanceiroAdmin overview={overview} />}
      </main>
    </div>
  );
}

function tabTitle(t: string) {
  return { visao: "Visão geral", medicos: "Gestão de médicos", clara: "Clara — Inteligência Artificial", financeiro: "Financeiro" }[t] ?? "Admin";
}

type Overview = Awaited<ReturnType<typeof adminOverview>>;
type Doctors = Awaited<ReturnType<typeof listDoctorsAdmin>>;

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

function SectionCard({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="text-headline-sm font-headline-sm text-primary">{title}</h3>
        {aside && <span className="text-body-sm font-body-sm text-on-surface-variant">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Funil({ funil }: { funil: Overview["funil"] }) {
  const max = Math.max(funil.mensagens, funil.conversas, funil.agendamentos, funil.realizadas, 1);
  const steps: [string, number][] = [
    ["Mensagens", funil.mensagens],
    ["Conversas", funil.conversas],
    ["Agendamentos", funil.agendamentos],
    ["Realizadas", funil.realizadas],
  ];
  return (
    <div className="space-y-3">
      {steps.map(([label, v]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-body-sm font-body-sm text-on-surface-variant">{label}</span>
          <div className="flex-1 h-8 rounded-lg bg-surface-container overflow-hidden">
            <div
              className="h-full sd-aurora flex items-center justify-end px-3 text-label-md font-label-md rounded-lg"
              style={{ width: `${Math.max(12, (v / max) * 100)}%` }}
            >
              {v}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApproveRow({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-outline-variant/40 last:border-0">
      <span className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-label-md font-label-md shrink-0">
        {initials(name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-label-lg font-label-lg text-primary truncate">{name}</div>
        <div className="text-body-sm font-body-sm text-on-surface-variant truncate">{sub}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button className="sd-aurora h-9 px-4 rounded-full text-label-md font-label-md active:scale-95 transition-transform">
          Aprovar
        </button>
        <button className="h-9 px-4 rounded-full border border-error/60 text-error text-label-md font-label-md hover:bg-error-container/40 transition-colors">
          Recusar
        </button>
      </div>
    </div>
  );
}

function Visao({ overview }: { overview: Overview }) {
  const { kpis, funil, especialidades, pendentes } = overview;
  const conv = funil.conversas > 0 ? Math.min(100, Math.round((funil.realizadas / funil.conversas) * 100)) : 0;
  const maxSpec = Math.max(...especialidades.map((e) => e.count), 1);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon="trending_up" label="GMV (mês)" value={money(kpis.gmvCents)} hint="volume transacionado" />
        <Kpi icon="account_balance_wallet" label="Receita (take 15%)" value={money(kpis.receitaCents)} hint="da plataforma" />
        <Kpi icon="event" label="Consultas hoje" value={String(kpis.consultasHoje)} />
        <Kpi icon="stethoscope" label="Médicos ativos" value={String(kpis.medicosAtivos)} hint={`${kpis.totalPacientes} pacientes`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SectionCard title="Funil da Clara" aside={`conversão ${conv}%`}>
            <Funil funil={funil} />
          </SectionCard>
          <SectionCard title="Consultas por especialidade">
            {especialidades.length === 0 ? (
              <p className="text-body-md font-body-md text-on-surface-variant py-4 text-center">Sem dados ainda.</p>
            ) : (
              <div className="space-y-3">
                {especialidades.map((e) => (
                  <div key={e.name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-body-sm font-body-sm text-on-surface">{e.icon} {e.name}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-surface-container overflow-hidden">
                      <div className="h-full sd-aurora rounded-full" style={{ width: `${(e.count / maxSpec) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-label-md font-label-md text-primary">{e.count}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Fila de aprovação" aside="SLA 24h">
            {pendentes.length === 0 ? (
              <p className="text-body-md font-body-md text-on-surface-variant py-4 text-center">Nenhum médico pendente 🎉</p>
            ) : (
              pendentes.map((d) => <ApproveRow key={d.id} name={d.name} sub={`${d.specialty} · ${d.crm}`} />)
            )}
          </SectionCard>
          <SectionCard title="⚠ Alertas">
            <div className="flex items-center gap-3 py-3 border-b border-outline-variant/40">
              <div className="flex-1">
                <div className="text-label-lg font-label-lg text-primary">{kpis.urgencias} urgência(s) sinalizada(s)</div>
                <div className="text-body-sm font-body-sm text-on-surface-variant">Fila de revisão médica semanal</div>
              </div>
              <span className="px-3 py-1 rounded-full border text-[11px] font-bold bg-secondary-container/50 border-secondary-fixed-dim text-on-secondary-container">revisar</span>
            </div>
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <div className="text-label-lg font-label-lg text-primary">{kpis.novosPacientes} novos pacientes</div>
                <div className="text-body-sm font-body-sm text-on-surface-variant">Últimos 7 dias</div>
              </div>
              <span className="px-3 py-1 rounded-full border text-[11px] font-bold bg-green-50 border-green-200 text-green-700">+</span>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function DoctorStatusPill({ status }: { status: string }) {
  if (status === "ACTIVE")
    return <span className="px-3 py-1 rounded-full border text-[11px] font-bold bg-green-50 border-green-200 text-green-700">Ativo</span>;
  if (status === "PENDING")
    return <span className="px-3 py-1 rounded-full border text-[11px] font-bold bg-secondary-container/50 border-secondary-fixed-dim text-on-secondary-container">Pendente</span>;
  return <span className="px-3 py-1 rounded-full border text-[11px] font-bold bg-surface-container border-outline-variant text-on-surface-variant">{status.toLowerCase()}</span>;
}

function Medicos({ overview, doctors }: { overview: Overview; doctors: Doctors }) {
  return (
    <div className="space-y-8">
      {overview.pendentes.length > 0 && (
        <SectionCard title="Aprovação pendente" aside={String(overview.pendentes.length)}>
          {overview.pendentes.map((d) => (
            <ApproveRow key={d.id} name={d.name} sub={`${d.specialty} · ${d.crm} · documentos enviados`} />
          ))}
        </SectionCard>
      )}

      <section className="space-y-3">
        <h3 className="text-headline-sm font-headline-sm text-primary mb-1">
          Médicos <span className="text-body-sm font-body-sm text-on-surface-variant">· {doctors.length}</span>
        </h3>
        {doctors.map((d) => (
          <div key={d.id} className={`${card} flex items-center gap-4 p-4`}>
            <span className="w-11 h-11 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-label-md font-label-md shrink-0">
              {initials(d.name)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-label-lg font-label-lg text-primary truncate">{d.name}</div>
              <div className="text-body-sm font-body-sm text-on-surface-variant">
                {d.specialty} · {d.consultas} consulta(s) · {d.rating > 0 ? `★ ${d.rating.toFixed(1)}` : "sem avaliação"} · comissão {(d.commissionBps / 100).toFixed(0)}%
              </div>
            </div>
            <DoctorStatusPill status={d.status} />
          </div>
        ))}
      </section>
    </div>
  );
}

function ConfigRows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="divide-y divide-outline-variant/50">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 py-3">
          <span className="text-body-md font-body-md text-on-surface-variant">{k}</span>
          <span className="text-label-lg font-label-lg text-primary text-right">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ClaraAdmin({ overview }: { overview: Overview }) {
  const { funil, kpis } = overview;
  const resolveRate = funil.conversas > 0 ? Math.round(((funil.conversas - kpis.urgencias) / funil.conversas) * 100) : 0;
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-secondary-fixed/40 bg-secondary-container/40 p-5 brand-shadow">
        <p className="flex items-start gap-2 text-body-md font-body-md text-on-secondary-container">
          <Icon name="auto_awesome" filled className="text-secondary shrink-0 mt-0.5" size={20} />
          Painel de configuração da Clara — no MVP, prompts versionados com diff/rollback, parâmetros de modelo e o dicionário de urgência (editável só com aprovação médica). Publicação exige evals verdes + 2ª aprovação.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon="smart_toy" label="Resolução sem humano" value={`${resolveRate}%`} hint="meta ≥ 85%" />
        <Kpi icon="forum" label="Conversas" value={String(funil.conversas)} />
        <Kpi icon="chat" label="Mensagens" value={String(funil.mensagens)} />
        <Kpi icon="e911_emergency" label="Urgências (nível 1+2)" value={String(kpis.urgencias)} hint="detecção determinística" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Funil da Clara">
          <Funil funil={funil} />
        </SectionCard>
        <SectionCard title="Configuração">
          <ConfigRows
            rows={[
              ["Modelo do agente", "Claude Opus 4.8"],
              ["Modelo auxiliar", "Haiku 4.5"],
              ["Prompt (versão)", "v1 · publicado"],
              ["Ferramentas ativas", "7 / 7"],
              ["Evals de regressão", <span key="e" className="text-secondary font-semibold">✓ verdes</span>],
            ]}
          />
        </SectionCard>
      </div>
    </div>
  );
}

function FinanceiroAdmin({ overview }: { overview: Overview }) {
  const { kpis } = overview;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon="trending_up" label="GMV (mês)" value={money(kpis.gmvCents)} />
        <Kpi icon="account_balance_wallet" label="Receita da plataforma" value={money(kpis.receitaCents)} hint="take 15%" />
        <Kpi icon="payments" label="Repasse aos médicos" value={money(kpis.gmvCents - kpis.receitaCents)} hint="D+2 pós-consulta" />
      </div>
      <SectionCard title="Conciliação">
        <ConfigRows
          rows={[
            ["Método principal", "PIX (split automático)"],
            ["Repasses do dia", "processados"],
            ["Inadimplência", <span key="i" className="text-secondary font-semibold">0%</span>],
            ["Disputas / chargeback", "0"],
          ]}
        />
      </SectionCard>
    </div>
  );
}
