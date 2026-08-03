import Link from "next/link";
import { ensureDemoData } from "@/modules/demo/seed-demo";
import { adminOverview, listDoctorsAdmin } from "@/modules/admin/service";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const initials = (n: string) => n.replace(/^(dra?\.?)\s+/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const NAV: [string, string, string][] = [
  ["visao", "⌂", "Visão geral"],
  ["medicos", "🩺", "Médicos"],
  ["clara", "✦", "Clara (IA)"],
  ["financeiro", "💰", "Financeiro"],
];

export default async function AdminPanel({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await ensureDemoData();
  const sp = await searchParams;
  const tab = sp.tab || "visao";
  const overview = await adminOverview();
  const doctors = await listDoctorsAdmin();

  return (
    <div className="panel">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <div className="m"><Logo /></div>
          <div className="t">Smart Doctor<small>Administração</small></div>
        </Link>
        {NAV.map(([id, ic, label]) => (
          <Link key={id} href={`/admin?tab=${id}`} className={`nav-link ${tab === id ? "active" : ""}`}>
            <span className="ic">{ic}</span>{label}
            {id === "medicos" && overview.pendentes.length > 0 && (
              <span style={{ marginLeft: "auto", background: "var(--danger)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 7px" }}>{overview.pendentes.length}</span>
            )}
          </Link>
        ))}
        <div className="foot">
          <div className="who">Paula Freitas</div>
          <div className="role">Administradora</div>
          <Link href="/" style={{ display: "inline-block", marginTop: 6 }}>← Trocar de perfil</Link>
        </div>
      </aside>

      <main className="main">
        <div className="main-head">
          <div>
            <h1>{tabTitle(tab)}</h1>
            <span className="sub">Smart Doctor · operação</span>
          </div>
          <div className="spacer" />
          <ThemeToggle />
        </div>

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

function Funil({ funil }: { funil: Overview["funil"] }) {
  const max = Math.max(funil.mensagens, funil.conversas, funil.agendamentos, funil.realizadas, 1);
  const steps: [string, number][] = [
    ["Mensagens", funil.mensagens],
    ["Conversas", funil.conversas],
    ["Agendamentos", funil.agendamentos],
    ["Realizadas", funil.realizadas],
  ];
  return (
    <div className="funnel">
      {steps.map(([label, v]) => (
        <div className="funnel-step" key={label}>
          <span className="flabel">{label}</span>
          <div className="fbar" style={{ width: `${Math.max(8, (v / max) * 100)}%` }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function Visao({ overview }: { overview: Overview }) {
  const { kpis, funil, especialidades, pendentes } = overview;
  const conv = funil.conversas > 0 ? Math.min(100, Math.round((funil.realizadas / funil.conversas) * 100)) : 0;
  const maxSpec = Math.max(...especialidades.map((e) => e.count), 1);
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><div className="lbl">GMV (mês)</div><div className="val">{money(kpis.gmvCents)}</div><div className="delta up">volume transacionado</div></div>
        <div className="kpi"><div className="lbl">Receita (take 15%)</div><div className="val">{money(kpis.receitaCents)}</div><div className="delta up">da plataforma</div></div>
        <div className="kpi"><div className="lbl">Consultas hoje</div><div className="val">{kpis.consultasHoje}</div></div>
        <div className="kpi"><div className="lbl">Médicos ativos</div><div className="val">{kpis.medicosAtivos}</div><div className="delta">{kpis.totalPacientes} pacientes</div></div>
      </div>

      <div className="grid-2">
        <div>
          <div className="block">
            <h3>✦ Funil da Clara <span className="count">conversão {conv}%</span></h3>
            <Funil funil={funil} />
          </div>
          <div className="block">
            <h3>Consultas por especialidade</h3>
            {especialidades.length === 0 ? <div className="empty" style={{ padding: 20 }}>Sem dados ainda.</div> :
              especialidades.map((e) => (
                <div className="spec-bar" key={e.name}>
                  <span className="sl">{e.icon} {e.name}</span>
                  <div className="track"><div className="fill" style={{ width: `${(e.count / maxSpec) * 100}%` }} /></div>
                  <span className="c">{e.count}</span>
                </div>
              ))}
          </div>
        </div>

        <div>
          <div className="block">
            <h3>Fila de aprovação <span className="count">SLA 24h</span></h3>
            {pendentes.length === 0 ? <div className="empty" style={{ padding: 20 }}>Nenhum médico pendente 🎉</div> :
              pendentes.map((d) => (
                <div className="approve-row" key={d.id}>
                  <span className="tbl-ava">{initials(d.name)}</span>
                  <div className="info"><div className="n">{d.name}</div><div className="s">{d.specialty} · {d.crm}</div></div>
                  <div className="acts"><button className="btn-sm primary">Aprovar</button><button className="btn-sm danger">Recusar</button></div>
                </div>
              ))}
          </div>
          <div className="block">
            <h3>⚠ Alertas</h3>
            <div className="approve-row"><div className="info"><div className="n">{kpis.urgencias} urgência(s) sinalizada(s)</div><div className="s">Fila de revisão médica semanal</div></div><span className="pill wait">revisar</span></div>
            <div className="approve-row"><div className="info"><div className="n">{kpis.novosPacientes} novos pacientes</div><div className="s">Últimos 7 dias</div></div><span className="pill ok">+</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function Medicos({ overview, doctors }: { overview: Overview; doctors: Doctors }) {
  return (
    <>
      {overview.pendentes.length > 0 && (
        <div className="block">
          <h3>Aprovação pendente <span className="count">{overview.pendentes.length}</span></h3>
          {overview.pendentes.map((d) => (
            <div className="approve-row" key={d.id}>
              <span className="tbl-ava">{initials(d.name)}</span>
              <div className="info"><div className="n">{d.name}</div><div className="s">{d.specialty} · {d.crm} · documentos enviados</div></div>
              <div className="acts"><button className="btn-sm primary">Aprovar</button><button className="btn-sm danger">Recusar</button></div>
            </div>
          ))}
        </div>
      )}
      <div className="block">
        <h3>Médicos <span className="count">{doctors.length}</span></h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Médico</th><th>Especialidade</th><th className="num">Consultas</th><th className="num">Avaliação</th><th className="num">Comissão</th><th>Status</th></tr></thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td className="name-cell"><span className="tbl-ava">{initials(d.name)}</span>{d.name}</td>
                  <td>{d.specialty}</td>
                  <td className="num">{d.consultas}</td>
                  <td className="num">{d.rating > 0 ? `★ ${d.rating.toFixed(1)}` : "—"}</td>
                  <td className="num">{(d.commissionBps / 100).toFixed(0)}%</td>
                  <td>{statusPill(d.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function statusPill(s: string) {
  if (s === "ACTIVE") return <span className="pill ok">Ativo</span>;
  if (s === "PENDING") return <span className="pill wait">Pendente</span>;
  return <span className="pill done">{s.toLowerCase()}</span>;
}

function ClaraAdmin({ overview }: { overview: Overview }) {
  const { funil, kpis } = overview;
  const resolveRate = funil.conversas > 0 ? Math.round(((funil.conversas - kpis.urgencias) / funil.conversas) * 100) : 0;
  return (
    <>
      <div className="demo-banner">
        ✦ Painel de configuração da Clara — no MVP, prompts versionados com diff/rollback, parâmetros de modelo e o dicionário de urgência (editável só com aprovação médica). Publicação exige evals verdes + 2ª aprovação.
      </div>
      <div className="kpi-grid">
        <div className="kpi"><div className="lbl">Resolução sem humano</div><div className="val">{resolveRate}%</div><div className="delta up">meta &ge; 85%</div></div>
        <div className="kpi"><div className="lbl">Conversas</div><div className="val">{funil.conversas}</div></div>
        <div className="kpi"><div className="lbl">Mensagens</div><div className="val">{funil.mensagens}</div></div>
        <div className="kpi"><div className="lbl">Urgências (nível 1+2)</div><div className="val">{kpis.urgencias}</div><div className="delta">detecção determinística</div></div>
      </div>
      <div className="grid-2">
        <div className="block">
          <h3>✦ Funil da Clara</h3>
          <Funil funil={funil} />
        </div>
        <div className="block">
          <h3>Configuração</h3>
          <div className="field-row"><span className="k">Modelo do agente</span><span className="v">Claude Opus 4.8</span></div>
          <div className="field-row"><span className="k">Modelo auxiliar</span><span className="v">Haiku 4.5</span></div>
          <div className="field-row"><span className="k">Prompt (versão)</span><span className="v">v1 · publicado</span></div>
          <div className="field-row"><span className="k">Ferramentas ativas</span><span className="v">7 / 7</span></div>
          <div className="field-row"><span className="k">Evals de regressão</span><span className="v" style={{ color: "var(--success)" }}>✓ verdes</span></div>
        </div>
      </div>
    </>
  );
}

function FinanceiroAdmin({ overview }: { overview: Overview }) {
  const { kpis } = overview;
  return (
    <>
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi"><div className="lbl">GMV (mês)</div><div className="val">{money(kpis.gmvCents)}</div></div>
        <div className="kpi"><div className="lbl">Receita da plataforma</div><div className="val">{money(kpis.receitaCents)}</div><div className="delta up">take 15%</div></div>
        <div className="kpi"><div className="lbl">Repasse aos médicos</div><div className="val">{money(kpis.gmvCents - kpis.receitaCents)}</div><div className="delta">D+2 pós-consulta</div></div>
      </div>
      <div className="block">
        <h3>Conciliação</h3>
        <div className="field-row"><span className="k">Método principal</span><span className="v">PIX (split automático)</span></div>
        <div className="field-row"><span className="k">Repasses do dia</span><span className="v">processados</span></div>
        <div className="field-row"><span className="k">Inadimplência</span><span className="v" style={{ color: "var(--success)" }}>0%</span></div>
        <div className="field-row"><span className="k">Disputas / chargeback</span><span className="v">0</span></div>
      </div>
    </>
  );
}
