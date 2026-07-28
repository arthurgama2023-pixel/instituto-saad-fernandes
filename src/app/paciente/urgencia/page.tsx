"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/brand/Avatar";
import { Icon } from "@/components/brand/Icon";
import { ErrorState, Loading } from "@/components/brand/ui";
import { money, specialtyIcon, timeLabel, type Specialty } from "@/lib/patient-data";
import { contagemRegressiva } from "@/lib/agendamento";

type Chamado = {
  id: string;
  status: "BUSCANDO" | "ACEITA" | "PAGA" | string;
  descricao: string;
  especialidade: string;
  especialidadeSlug: string;
  criadoEm: string;
  expiraEm: string;
  medico: { nome: string; crm: string; bio: string; rating: number; yearsExp: number } | null;
  consulta: {
    id: string;
    startsAt: string;
    durationMin: number;
    mode: string;
    status: string;
    holdUntil: string | null;
  } | null;
  pagamento: { id: string; pixCode: string; amountCents: number; status: string } | null;
};

type Payload = { especialidades: Specialty[]; chamado: Chamado | null };

// Enquanto procura médico a tela precisa reagir rápido; parada a espera, não.
const POLL_MS = 3000;

export default function UrgenciaPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [erro, setErro] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/urgencia");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPayload(await r.json());
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Só fica batendo no servidor enquanto o chamado está de fato procurando alguém.
  const buscando = payload?.chamado?.status === "BUSCANDO";
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;
  useEffect(() => {
    if (!buscando) return;
    const id = setInterval(() => carregarRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, [buscando]);

  const abrir = async () => {
    if (!slug) return;
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/urgencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ especialidade: slug, descricao }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setPayload((p) => (p ? { ...p, chamado: d.chamado } : p));
    } catch {
      setAviso("Não consegui abrir o chamado. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const cancelar = async (chamadoId: string) => {
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/urgencia/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chamadoId }),
      });
      if (r.status === 409) {
        setAviso("Um médico acabou de aceitar seu chamado.");
        await carregar();
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setPayload((p) => (p ? { ...p, chamado: d.chamado } : p));
    } catch {
      setAviso("Não consegui cancelar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const pagar = async (pagamentoId: string) => {
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/urgencia/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagamentoId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setPayload((p) => (p ? { ...p, chamado: d.chamado } : p));
    } catch {
      setAviso("O pagamento não foi confirmado. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  if (erro && !payload) return <ErrorState onRetry={carregar} />;
  if (!payload) return <Loading />;

  const chamado = payload.chamado;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full px-5 py-4">
        <h1 className="text-headline-sm font-headline-sm text-primary">Urgência</h1>
        <p className="text-label-md font-label-md text-on-surface-variant">
          Atendimento agora, com quem estiver disponível.
        </p>
      </header>

      <main className="max-w-[560px] mx-auto px-5 pt-2 space-y-6">
        {aviso && (
          <p
            role="alert"
            className="flex items-start gap-2 p-4 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm"
          >
            <Icon name="error" size={18} />
            {aviso}
          </p>
        )}

        <AvisoEmergencia />

        {!chamado || chamado.status === "CANCELADA" || chamado.status === "EXPIRADA" ? (
          <NovoChamado
            especialidades={payload.especialidades}
            slug={slug}
            descricao={descricao}
            enviando={enviando}
            onSlug={setSlug}
            onDescricao={setDescricao}
            onAbrir={abrir}
          />
        ) : chamado.status === "BUSCANDO" ? (
          <Procurando chamado={chamado} enviando={enviando} onCancelar={() => cancelar(chamado.id)} />
        ) : chamado.status === "ACEITA" ? (
          <Aceito chamado={chamado} enviando={enviando} onPagar={pagar} />
        ) : (
          <Confirmado chamado={chamado} />
        )}
      </main>
    </>
  );
}

function AvisoEmergencia() {
  return (
    <aside className="flex items-start gap-3 p-4 rounded-xl border border-error/30 bg-error-container/40">
      <Icon name="emergency" className="text-error shrink-0" size={20} />
      <p className="text-body-sm font-body-sm text-on-error-container">
        Risco de vida — dor no peito, falta de ar intensa, sinais de AVC, sangramento intenso — não é
        para cá. Ligue <strong>192 (SAMU)</strong> ou vá ao pronto-socorro mais próximo.
      </p>
    </aside>
  );
}

function NovoChamado({
  especialidades,
  slug,
  descricao,
  enviando,
  onSlug,
  onDescricao,
  onAbrir,
}: {
  especialidades: Specialty[];
  slug: string | null;
  descricao: string;
  enviando: boolean;
  onSlug: (s: string) => void;
  onDescricao: (d: string) => void;
  onAbrir: () => void;
}) {
  return (
    <>
      <section>
        <h2 className="text-headline-md font-headline-md text-primary mb-2">Precisa de atendimento agora?</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Abrimos um chamado para os médicos da especialidade. O primeiro que aceitar assume seu
          atendimento.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">
          Especialidade
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {especialidades.map((s) => {
            const ativo = s.slug === slug;
            return (
              <button
                key={s.slug}
                onClick={() => onSlug(s.slug)}
                aria-pressed={ativo}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  ativo
                    ? "border-secondary bg-surface-container-low"
                    : "border-outline-variant bg-surface-container-lowest"
                }`}
              >
                <Icon name={specialtyIcon(s.slug)} className={ativo ? "text-secondary" : "text-primary"} size={26} />
                <span className="text-label-md font-label-md text-primary text-center leading-tight">
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">
          O que está acontecendo?
        </h3>
        <textarea
          value={descricao}
          onChange={(e) => onDescricao(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Descreva rapidamente o que você está sentindo. O médico vê isso antes de aceitar."
          className="w-full p-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container resize-none focus:border-secondary focus:outline-none"
        />
      </section>

      <button
        onClick={onAbrir}
        disabled={!slug || enviando}
        className="w-full h-14 bg-error text-white rounded-xl text-label-lg font-label-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
      >
        <Icon name="bolt" filled />
        {enviando ? "ABRINDO CHAMADO…" : "CHAMAR MÉDICO AGORA"}
      </button>
    </>
  );
}

function Procurando({
  chamado,
  enviando,
  onCancelar,
}: {
  chamado: Chamado;
  enviando: boolean;
  onCancelar: () => void;
}) {
  const [decorrido, setDecorrido] = useState("0:00");
  const [restante, setRestante] = useState(() => contagemRegressiva(chamado.expiraEm));

  useEffect(() => {
    const tick = () => {
      const seg = Math.floor((Date.now() - new Date(chamado.criadoEm).getTime()) / 1000);
      setDecorrido(`${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`);
      setRestante(contagemRegressiva(chamado.expiraEm));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [chamado.criadoEm, chamado.expiraEm]);

  return (
    <>
      <section className="flex flex-col items-center text-center gap-4 py-8">
        <span className="relative flex w-24 h-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-error/20 animate-ping" />
          <span className="relative w-20 h-20 rounded-full bg-error-container flex items-center justify-center">
            <Icon name="sensors" className="text-error" size={40} />
          </span>
        </span>
        <h2 className="text-headline-md font-headline-md text-primary">Procurando médico…</h2>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-xs">
          Seu chamado de <strong>{chamado.especialidade}</strong> foi enviado. Assim que alguém aceitar,
          você é avisado aqui.
        </p>
        <div className="flex gap-8 mt-2">
          <div>
            <p className="text-headline-md font-headline-md text-primary">{decorrido}</p>
            <p className="text-label-md font-label-md text-on-surface-variant">procurando</p>
          </div>
          <div>
            <p className="text-headline-md font-headline-md text-secondary">{restante}</p>
            <p className="text-label-md font-label-md text-on-surface-variant">para expirar</p>
          </div>
        </div>
      </section>

      {chamado.descricao && (
        <section className="p-4 rounded-xl bg-surface-container-low">
          <h3 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            O que você relatou
          </h3>
          <p className="text-body-sm font-body-sm text-on-surface">{chamado.descricao}</p>
        </section>
      )}

      <button
        onClick={onCancelar}
        disabled={enviando}
        className="w-full h-12 rounded-xl border border-outline-variant text-primary text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50"
      >
        CANCELAR CHAMADO
      </button>
    </>
  );
}

function Aceito({
  chamado,
  enviando,
  onPagar,
}: {
  chamado: Chamado;
  enviando: boolean;
  onPagar: (pagamentoId: string) => void;
}) {
  const { medico, consulta, pagamento } = chamado;
  const [restante, setRestante] = useState(() =>
    consulta?.holdUntil ? contagemRegressiva(consulta.holdUntil) : "",
  );

  useEffect(() => {
    if (!consulta?.holdUntil) return;
    const id = setInterval(() => setRestante(contagemRegressiva(consulta.holdUntil!)), 1000);
    return () => clearInterval(id);
  }, [consulta?.holdUntil]);

  if (!medico || !consulta || !pagamento) return <Loading />;

  return (
    <>
      <section className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
          <Icon name="how_to_reg" filled className="text-secondary" size={34} />
        </div>
        <h2 className="text-headline-md font-headline-md text-primary">Médico encontrado</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Confirme o pagamento em <strong className="text-secondary">{restante}</strong> para garantir o
          atendimento.
        </p>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 brand-shadow">
        <div className="flex items-start gap-4 mb-4">
          <Avatar name={medico.nome} size={56} />
          <div className="flex-grow min-w-0">
            <h3 className="text-body-lg font-bold text-primary">{medico.nome}</h3>
            <p className="text-label-md font-label-md text-on-surface-variant">
              {medico.crm} · {medico.yearsExp} anos
            </p>
            <p className="flex items-center gap-1 text-label-md font-label-md text-secondary">
              <Icon name="star" filled size={16} /> {medico.rating.toFixed(1)}
            </p>
          </div>
          <span className="text-body-lg font-bold text-primary shrink-0">{money(pagamento.amountCents)}</span>
        </div>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">{medico.bio}</p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-container">
          <Icon name="schedule" className="text-secondary" size={18} />
          <p className="text-body-sm font-body-sm text-on-surface">
            Começa às <strong>{timeLabel(consulta.startsAt)}</strong> ·{" "}
            {consulta.mode === "VIDEO" ? "teleconsulta" : "presencial"} · {consulta.durationMin} min
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-low p-5">
        <h3 className="text-label-lg font-label-lg text-primary mb-3 flex items-center gap-2">
          <Icon name="qr_code_2" size={20} /> PIX copia e cola
        </h3>
        <p className="font-mono text-[11px] leading-relaxed text-on-surface-variant break-all bg-surface-container-lowest rounded-lg p-3">
          {pagamento.pixCode}
        </p>
      </section>

      <button
        onClick={() => onPagar(pagamento.id)}
        disabled={enviando}
        className="w-full h-14 bg-secondary text-white rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50"
      >
        {enviando ? "CONFIRMANDO…" : "SIMULAR PAGAMENTO"}
      </button>
      <p className="text-center text-body-sm font-body-sm text-on-surface-variant">
        Modo demonstração: o gateway real entra na próxima fase.
      </p>
    </>
  );
}

function Confirmado({ chamado }: { chamado: Chamado }) {
  return (
    <section className="flex flex-col items-center text-center gap-4 py-8">
      <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
        <Icon name="check_circle" filled className="text-secondary" size={44} />
      </div>
      <h2 className="text-headline-md font-headline-md text-primary">Atendimento confirmado</h2>
      <p className="text-body-md font-body-md text-on-surface-variant">
        {chamado.especialidade} com {chamado.medico?.nome}
      </p>
      {chamado.consulta && (
        <p className="text-body-md font-body-md text-on-surface">
          Começa às {timeLabel(chamado.consulta.startsAt)} ·{" "}
          {chamado.consulta.mode === "VIDEO" ? "teleconsulta" : "presencial"}
        </p>
      )}
      {chamado.consulta && (
        <Link
          href={`/paciente/consultas/${chamado.consulta.id}`}
          className="w-full h-14 bg-primary-container text-white rounded-xl text-label-lg font-label-lg flex items-center justify-center mt-4"
        >
          VER DETALHES
        </Link>
      )}
    </section>
  );
}
