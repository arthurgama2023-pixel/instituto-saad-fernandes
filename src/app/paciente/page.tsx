"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClaraChat } from "@/components/ClaraChat";
import { SPulse } from "@/components/SPulse";
import { ThemeToggle } from "@/components/ThemeToggle";

type Appt = {
  id: string;
  medico: string;
  especialidade: string;
  icon: string;
  startsAt: string;
  status: string;
  mode: string;
  priceCents: number;
};
type PatientData = {
  name: string;
  next: Appt | null;
  upcoming: Appt[];
  past: Appt[];
  specialties: { slug: string; name: string; icon: string }[];
  healthSummary: string;
};

type Tab = "inicio" | "agenda" | "clara" | "saude" | "perfil";

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dayNum = (iso: string) => new Date(iso).getDate().toString().padStart(2, "0");
const monthShort = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const t2 = new Date(today); t2.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Hoje";
  if (same(d, t2)) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
};

function StatusPill({ s }: { s: string }) {
  if (s === "CONFIRMADA") return <span className="pill ok">✓ Confirmada</span>;
  if (s === "AGUARDANDO_PAGAMENTO") return <span className="pill wait">⏱ Aguardando</span>;
  if (s === "CONCLUIDA") return <span className="pill done">Concluída</span>;
  return <span className="pill done">{s.toLowerCase()}</span>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PacienteApp() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [data, setData] = useState<PatientData | null>(null);
  const [error, setError] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetch("/api/paciente")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  // PWA: captura o prompt de instalação e detecta se já está rodando como app
  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(!!isStandalone);
    const onInstalled = () => { setStandalone(true); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch { /* ignore */ }
      setDeferredPrompt(null);
    } else {
      setShowInstall(true); // sem prompt nativo → mostra instruções (iOS, etc.)
    }
  }, [deferredPrompt]);

  const titles: Record<Tab, string> = {
    inicio: "Início", agenda: "Agenda", clara: "Clara", saude: "Saúde", perfil: "Perfil",
  };

  return (
    <div className="phone">
      {tab !== "clara" && (
        <header className="phone-head">
          <Link href="/" className="back" aria-label="Voltar ao portal">‹</Link>
          <span className="title">{titles[tab]}</span>
          <div className="phone-head-actions">
            <ThemeToggle />
            <span className="bell" aria-hidden>🔔</span>
          </div>
        </header>
      )}

      <div className={tab === "clara" ? "phone-body no-pad" : "phone-body"}>
        {tab === "clara" ? (
          <ClaraChat />
        ) : error && !data ? (
          <div className="empty">
            <span className="em">📡</span>
            Não consegui carregar seus dados.<br />Verifique a conexão.
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-aurora" onClick={load}>Tentar de novo</button>
            </div>
          </div>
        ) : tab === "inicio" ? (
          <Inicio data={data} go={setTab} />
        ) : tab === "agenda" ? (
          <Agenda data={data} go={setTab} />
        ) : tab === "saude" ? (
          <Saude data={data} />
        ) : (
          <Perfil data={data} onInstall={install} installed={standalone} />
        )}
      </div>

      {showInstall && <InstallSheet onClose={() => setShowInstall(false)} />}

      <nav className="bottomnav">
        <button className={`navitem ${tab === "inicio" ? "active" : ""}`} onClick={() => setTab("inicio")}>
          <span className="ic">⌂</span>Início
        </button>
        <button className={`navitem ${tab === "agenda" ? "active" : ""}`} onClick={() => setTab("agenda")}>
          <span className="ic">📅</span>Agenda
        </button>
        <button className="navitem fab" onClick={() => setTab("clara")} aria-label="Falar com a Clara">
          <span className="ic"><SPulse /></span>Clara
        </button>
        <button className={`navitem ${tab === "saude" ? "active" : ""}`} onClick={() => setTab("saude")}>
          <span className="ic">♥</span>Saúde
        </button>
        <button className={`navitem ${tab === "perfil" ? "active" : ""}`} onClick={() => setTab("perfil")}>
          <span className="ic">👤</span>Perfil
        </button>
      </nav>
    </div>
  );
}

function Inicio({ data, go }: { data: PatientData | null; go: (t: Tab) => void }) {
  if (!data) return <div className="empty">Carregando…</div>;
  const first = data.name.split(" ")[0];
  return (
    <>
      <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "Plus Jakarta Sans, inherit", margin: "2px 4px 16px" }}>
        Olá, {first} 👋
      </p>

      {data.next ? (
        <div className="p-card hero">
          <div className="lbl">✦ PRÓXIMA CONSULTA</div>
          <div className="doc">{data.next.medico}</div>
          <div className="when">
            {dayLabel(data.next.startsAt)} · {timeLabel(data.next.startsAt)} · {data.next.mode === "VIDEO" ? "📹 vídeo" : "🏥 presencial"}
          </div>
          <div className="btn-row">
            <button className="btn" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }} onClick={() => go("agenda")}>Ver detalhes</button>
          </div>
        </div>
      ) : (
        <div className="p-card hero">
          <div className="lbl">✦ CUIDE-SE</div>
          <div className="doc">Nenhuma consulta agendada</div>
          <div className="when">Me conta o que você está sentindo que eu encontro o especialista.</div>
        </div>
      )}

      <div className="p-card clara-cta" onClick={() => go("clara")}>
        <div className="mini"><SPulse /></div>
        <div className="txt">Como você está hoje? Me conta que eu cuido do resto. <strong>Falar com a Clara →</strong></div>
      </div>

      <div className="p-sec-title">Especialidades</div>
      <div className="spec-row">
        {data.specialties.map((s) => (
          <button key={s.slug} className="spec-chip" onClick={() => go("clara")}>{s.icon} {s.name}</button>
        ))}
      </div>
    </>
  );
}

function Agenda({ data, go }: { data: PatientData | null; go: (t: Tab) => void }) {
  if (!data) return <div className="empty">Carregando…</div>;
  if (data.upcoming.length === 0 && data.past.length === 0) {
    return (
      <div className="empty">
        <span className="em">📅</span>
        Nenhuma consulta por aqui.<br />Que tal cuidar de você?
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-aurora" onClick={() => go("clara")}>✦ Falar com a Clara</button>
        </div>
      </div>
    );
  }
  return (
    <>
      {data.upcoming.length > 0 && <div className="p-sec-title">Próximas</div>}
      {data.upcoming.map((a) => <ApptItem key={a.id} a={a} />)}
      {data.past.length > 0 && <div className="p-sec-title">Passadas</div>}
      {data.past.map((a) => <ApptItem key={a.id} a={a} />)}
    </>
  );
}

function ApptItem({ a }: { a: Appt }) {
  return (
    <div className="appt-item">
      <div className="date-badge">
        <div className="d">{dayNum(a.startsAt)}</div>
        <div className="m">{monthShort(a.startsAt)}</div>
      </div>
      <div className="info">
        <div className="n">{a.medico}</div>
        <div className="s">{a.icon} {a.especialidade} · {timeLabel(a.startsAt)} · {money(a.priceCents)}</div>
      </div>
      <StatusPill s={a.status} />
    </div>
  );
}

function Saude({ data }: { data: PatientData | null }) {
  if (!data) return <div className="empty">Carregando…</div>;
  return (
    <>
      <div className="clara-summary">
        <div className="tag"><span className="dot" /> Gerado pela Clara</div>
        <div style={{ fontSize: 14 }}>{data.healthSummary}</div>
      </div>

      <div className="p-sec-title">Receitas</div>
      {data.past.length > 0 ? (
        data.past.map((a) => (
          <div className="appt-item" key={a.id}>
            <div className="date-badge" style={{ width: 40 }}><div style={{ fontSize: 22 }}>💊</div></div>
            <div className="info">
              <div className="n">Receita — {a.especialidade}</div>
              <div className="s">{a.medico} · {new Date(a.startsAt).toLocaleDateString("pt-BR")}</div>
            </div>
            <span className="pill info">PDF</span>
          </div>
        ))
      ) : (
        <div className="empty"><span className="em">💊</span>Suas receitas aparecem aqui após cada consulta.</div>
      )}

      <div className="p-sec-title">Exames</div>
      <div className="empty" style={{ padding: "24px 20px" }}><span className="em">🧪</span>Nenhum exame ainda.</div>
    </>
  );
}

function Perfil({ data, onInstall, installed }: { data: PatientData | null; onInstall: () => void; installed: boolean }) {
  if (!data) return <div className="empty">Carregando…</div>;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: 999, background: "var(--aurora-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, color: "var(--primary)" }}>
          {data.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, fontFamily: "Plus Jakarta Sans, inherit" }}>{data.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-3)" }}>Paciente · Smart Doctor</div>
        </div>
      </div>

      <div className="install-card">
        <div className="mini"><SPulse /></div>
        <div className="tx">
          <div className="n">Smart Doctor como app</div>
          <div className="s">{installed ? "App instalado neste dispositivo ✓" : "Adicione à tela inicial e abra em tela cheia."}</div>
        </div>
        {installed ? (
          <span className="pill ok" style={{ padding: "6px 12px" }}>Instalado</span>
        ) : (
          <button className="btn btn-aurora" onClick={onInstall}>📲 Instalar</button>
        )}
      </div>

      <div className="p-card">
        <div className="field-row"><span className="k">Nome</span><span className="v">{data.name}</span></div>
        <div className="field-row"><span className="k">WhatsApp</span><span className="v">(21) 98082-8309</span></div>
        <div className="field-row"><span className="k">Convênio</span><span className="v">Particular</span></div>
        <div className="field-row"><span className="k">Dependentes</span><span className="v">Nenhum</span></div>
      </div>

      <div className="p-sec-title">Privacidade e dados (LGPD)</div>
      <div className="p-card">
        <div className="field-row"><span className="k">📥 Baixar meus dados</span><span className="v" style={{ color: "var(--primary)" }}>Solicitar</span></div>
        <div className="field-row"><span className="k">🔔 Notificações</span><span className="v">WhatsApp</span></div>
        <div className="field-row"><span className="k">🗑 Excluir minha conta</span><span className="v" style={{ color: "var(--danger)" }}>Excluir</span></div>
      </div>
      <div className="privacy-note">
        Seus dados de saúde são sensíveis e protegidos pela LGPD. O prontuário é guardado por 20 anos por exigência do CFM, mesmo após a exclusão da conta.
      </div>
    </>
  );
}

function InstallSheet({ onClose }: { onClose: () => void }) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  const steps = isIOS
    ? [
        <>Toque no botão <strong>Compartilhar</strong> <span aria-hidden>⬆️</span> na barra do Safari.</>,
        <>Escolha <strong>“Adicionar à Tela de Início”</strong>.</>,
        <>Toque em <strong>Adicionar</strong> — pronto, o Smart Doctor vira um app 🎉</>,
      ]
    : isAndroid
      ? [
          <>Toque no menu <strong>⋮</strong> do navegador.</>,
          <>Escolha <strong>“Instalar app”</strong> ou <strong>“Adicionar à tela inicial”</strong>.</>,
          <>Confirme — o ícone aparece junto dos seus apps 🎉</>,
        ]
      : [
          <>No Chrome/Edge, clique no ícone <strong>Instalar</strong> <span aria-hidden>⊕</span> na barra de endereço.</>,
          <>Ou abra o menu <strong>⋮</strong> → <strong>“Instalar Smart Doctor”</strong>.</>,
        ];

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <h4>📲 Instalar o Smart Doctor</h4>
        <p>Tenha o app na tela inicial, abrindo em tela cheia como um aplicativo nativo.</p>
        {steps.map((s, i) => (
          <div className="step" key={i}>
            <span className="n">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
        <button className="btn btn-aurora sheet-close" onClick={onClose}>Entendi</button>
      </div>
    </div>
  );
}
