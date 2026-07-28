"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SPulse } from "@/components/SPulse";
import { ThemeToggle } from "@/components/ThemeToggle";

type UiEvent =
  | { type: "doctors"; items: DoctorItem[] }
  | { type: "payment"; payment: { id: string; pixCode: string; amountCents: number; status: string } }
  | { type: "appointment"; appt: ApptSummary }
  | { type: "emergency" };

type DoctorItem = {
  id: string;
  name: string;
  specialty: string;
  specialtyIcon: string;
  rating: number;
  priceCents: number;
  nextSlots: string[];
};
type ApptSummary = { medico: string; especialidade: string; quando: string; valor: string };
type Msg = {
  id: string;
  role: "user" | "clara" | "system";
  content: string;
  payload: { uiEvents?: UiEvent[]; quickReplies?: string[] } | null;
};

const money = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const slotLabel = (iso: string) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};

function rich(text: string) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = esc
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ClaraChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const [aiMode, setAiMode] = useState<"claude" | "local">("local");
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [confirmReset, setConfirmReset] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages);
        setAiMode(d.aiMode);
        setBooted(true);
        scrollDown();
      })
      .catch(() => setBooted(true));
  }, [scrollDown]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setInput("");
      setLoading(true);
      setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: trimmed, payload: null }]);
      scrollDown();
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        const d = await r.json();
        if (d.messages) setMessages(d.messages);
      } catch {
        setMessages((m) => [
          ...m,
          { id: `err-${Date.now()}`, role: "clara", content: "Ops, tive um problema de conexão. Tenta de novo?", payload: null },
        ]);
      } finally {
        setLoading(false);
        scrollDown();
      }
    },
    [loading, scrollDown],
  );

  const doReset = useCallback(async () => {
    setConfirmReset(false);
    setLoading(true);
    try {
      const r = await fetch("/api/chat/reset", { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.messages) setMessages(d.messages);
      setPaidIds(new Set());
    } catch {
      // mantém a conversa atual + reabre a confirmação para o usuário tentar de novo
      setConfirmReset(true);
    } finally {
      setLoading(false);
      scrollDown();
    }
  }, [scrollDown]);

  const simulatePay = useCallback(
    async (paymentId: string) => {
      setPaidIds((s) => new Set(s).add(paymentId));
      setLoading(true);
      try {
        const r = await fetch("/api/payments/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        const d = await r.json();
        if (d.messages) setMessages(d.messages);
      } finally {
        setLoading(false);
        scrollDown();
      }
    },
    [scrollDown],
  );

  const last = messages[messages.length - 1];
  const chips = !loading && last?.role === "clara" ? last.payload?.quickReplies ?? [] : [];

  return (
    <div className="clara-embed">
      <header className="header">
        <div className="avatar-clara"><SPulse /></div>
        <div>
          <div className="t">Clara</div>
          <div className="s">online</div>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <button
            className="reset-btn"
            onClick={() => setConfirmReset(true)}
            disabled={loading}
            title="Reiniciar conversa"
            aria-label="Reiniciar conversa"
          >
            ↺
          </button>
          <span className="mode-pill">{aiMode === "claude" ? "✦ Claude Opus 4.8" : "✦ demo · IA local"}</span>
        </div>
      </header>

      <main className="chat">
        {messages.map((m, i) => (
          <MessageView
            key={m.id}
            msg={m}
            showTag={m.role === "clara" && messages[i - 1]?.role !== "clara"}
            onPick={send}
            onPay={simulatePay}
            paidIds={paidIds}
          />
        ))}
        {(loading || !booted) && <div className="typing" aria-label="Clara está digitando"><i /><i /><i /></div>}
        <div ref={bottomRef} />
      </main>

      {chips.length > 0 && (
        <div className="quick">
          {chips.map((c) => (
            <button key={c} className="qr" onClick={() => send(c)}>{c}</button>
          ))}
        </div>
      )}

      <form className="inputbar" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escreva para a Clara…" aria-label="Mensagem" />
        <button className="send" type="submit" disabled={loading || !input.trim()} aria-label="Enviar">➤</button>
      </form>

      {confirmReset && (
        <div className="sheet-overlay" onClick={() => setConfirmReset(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <h4>↺ Reiniciar conversa?</h4>
            <p>As mensagens desta conversa serão apagadas e a Clara recomeça do zero. Suas consultas não são afetadas.</p>
            <div className="sheet-actions">
              <button className="btn btn-outline" onClick={() => setConfirmReset(false)}>Cancelar</button>
              <button className="btn btn-aurora" onClick={doReset}>Reiniciar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageView({
  msg,
  showTag,
  onPick,
  onPay,
  paidIds,
}: {
  msg: Msg;
  showTag: boolean;
  onPick: (t: string) => void;
  onPay: (id: string) => void;
  paidIds: Set<string>;
}) {
  const events = msg.payload?.uiEvents ?? [];
  return (
    <>
      {showTag && <div className="clara-tag"><span className="dot" /> Clara · assistente de IA</div>}
      <div className={`msg ${msg.role === "user" ? "user" : "clara"}`}>{rich(msg.content)}</div>
      {events.map((ev, i) => {
        if (ev.type === "doctors") {
          return (
            <div className="card" key={i}>
              {ev.items.map((d, j) => (
                <div className="doc-row" key={d.id}>
                  <div className="doc-ava">{initials(d.name)}</div>
                  <div className="doc-info">
                    <div className="doc-name">{j + 1}. {d.name} <span style={{ color: "var(--warning)", fontWeight: 600 }}>★{d.rating}</span></div>
                    <div className="doc-sub">{d.specialtyIcon} {d.specialty} · {money(d.priceCents)}</div>
                    {d.nextSlots[0] && <div className="doc-next">próximo: {slotLabel(d.nextSlots[0])}</div>}
                  </div>
                  <button className="btn btn-primary" onClick={() => onPick(String(j + 1))}>Agendar</button>
                </div>
              ))}
            </div>
          );
        }
        if (ev.type === "payment") {
          const paid = paidIds.has(ev.payment.id) || ev.payment.status === "CONFIRMED";
          return (
            <div className="card" key={i}>
              <div className="pay-title">
                <span>💳 PIX — reserva de 15 min</span>
                <span className="pay-amount">{money(ev.payment.amountCents)}</span>
              </div>
              <div className="pix-code">{ev.payment.pixCode}</div>
              <div className="pay-actions">
                <button className="btn btn-outline" onClick={() => navigator.clipboard?.writeText(ev.payment.pixCode)}>Copiar código</button>
                <button className="btn btn-aurora" disabled={paid} onClick={() => onPay(ev.payment.id)}>{paid ? "Pago ✓" : "Simular pagamento PIX"}</button>
              </div>
            </div>
          );
        }
        if (ev.type === "appointment") {
          return (
            <div className="card appt-card" key={i}>
              <div className="appt-check">✓ Consulta confirmada</div>
              <div className="appt-line"><strong>{ev.appt.medico}</strong> · {ev.appt.especialidade}</div>
              <div className="appt-line">{ev.appt.quando} · {ev.appt.valor}</div>
            </div>
          );
        }
        if (ev.type === "emergency") {
          return (
            <div className="card emergency-card" key={i}>
              <div className="emergency-title">⚠ Emergência — procure ajuda agora</div>
              <div className="emergency-line">🚑 SAMU: <strong>192</strong> · 💙 CVV: <strong>188</strong> (24h, gratuito)</div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

function initials(name: string) {
  return name
    .replace(/^(dra?\.?)\s+/i, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
