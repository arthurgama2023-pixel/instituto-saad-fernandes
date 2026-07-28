"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/brand/Avatar";
import { Icon } from "@/components/brand/Icon";
import { ErrorState, Loading, PageHeader } from "@/components/brand/ui";
import { money, specialtyIcon, timeLabel, usePatient, type Specialty } from "@/lib/patient-data";
import {
  contagemRegressiva,
  dataExtenso,
  rotuloDia,
  type Confirmacao,
  type Disponibilidade,
  type Horario,
  type Medico,
  type Reserva,
} from "@/lib/agendamento";

const BLURB: Record<string, string> = {
  tricologia: "Diagnóstico e tratamento de doenças do cabelo e couro cabeludo.",
  dermatologia: "Cuidado da pele: lesões, acne, manchas e estética.",
  "clinica-geral": "Avaliação geral da sua saúde, prevenção e tratamento.",
};

const PASSOS = ["Especialidade", "Data e horário", "Médico", "Pagamento"];

type Passo = 1 | 2 | 3 | 4;

function AgendarFlow() {
  const router = useRouter();
  const preset = useSearchParams().get("especialidade");
  const { data, error, reload } = usePatient();

  const [passo, setPasso] = useState<Passo>(1);
  const [slug, setSlug] = useState<string | null>(preset);
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade | null>(null);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [dia, setDia] = useState<string | null>(null);
  const [horario, setHorario] = useState<Horario | null>(null);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // A pré-seleção via querystring só vale quando a especialidade existe de fato.
  useEffect(() => {
    if (!data || !preset) return;
    if (!data.specialties.some((s) => s.slug === preset)) setSlug(null);
  }, [data, preset]);

  const buscarAgenda = useCallback(async (especialidade: string) => {
    setCarregandoAgenda(true);
    setAviso(null);
    try {
      const r = await fetch(`/api/agendamento?especialidade=${encodeURIComponent(especialidade)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: Disponibilidade = await r.json();
      setDisponibilidade(d);
      setDia(d.dias[0]?.data ?? null);
      setHorario(null);
    } catch {
      setAviso("Não consegui carregar a agenda. Tente de novo.");
    } finally {
      setCarregandoAgenda(false);
    }
  }, []);

  const irParaDataEHorario = () => {
    if (!slug) return;
    setPasso(2);
    buscarAgenda(slug);
  };

  const reservar = async (escolhido: Medico) => {
    if (!horario) return;
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/agendamento/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicoId: escolhido.id, iso: horario.iso }),
      });
      if (r.status === 409) {
        setAviso("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.");
        setPasso(2);
        if (slug) buscarAgenda(slug);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setReserva(await r.json());
      setPasso(4);
    } catch {
      setAviso("Não consegui reservar o horário. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const pagar = async () => {
    if (!reserva) return;
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/agendamento/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagamentoId: reserva.pagamento.id }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setConfirmacao(await r.json());
    } catch {
      setAviso("O pagamento não foi confirmado. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const voltar = () => {
    setAviso(null);
    if (passo === 1) return router.push("/paciente");
    // Voltar do pagamento significaria abandonar a reserva; devolve para o médico.
    if (passo === 4) {
      setReserva(null);
      setPasso(3);
      return;
    }
    setPasso((passo - 1) as Passo);
  };

  if (confirmacao) return <Confirmado confirmacao={confirmacao} />;
  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  const especialidade = data.specialties.find((s) => s.slug === slug) ?? null;
  const medicosDoHorario = horario
    ? (disponibilidade?.medicos.filter((m) => horario.medicoIds.includes(m.id)) ?? [])
    : [];

  return (
    <>
      <PageHeader title="Agendar consulta" onBack={voltar} />

      <main className="w-full max-w-[560px] mx-auto px-5 pb-40">
        <Stepper atual={passo} />

        {aviso && (
          <p
            role="alert"
            className="mb-6 flex items-start gap-2 p-4 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm"
          >
            <Icon name="error" size={18} />
            {aviso}
          </p>
        )}

        {passo === 1 && (
          <PassoEspecialidade
            especialidades={data.specialties}
            selecionada={slug}
            onSelecionar={setSlug}
          />
        )}

        {passo === 2 &&
          (carregandoAgenda ? (
            <Loading label="Buscando horários…" />
          ) : (
            <PassoDataEHorario
              disponibilidade={disponibilidade}
              dia={dia}
              horario={horario}
              onDia={(d) => {
                setDia(d);
                setHorario(null);
              }}
              onHorario={setHorario}
            />
          ))}

        {passo === 3 && horario && (
          <PassoMedico
            especialidade={especialidade}
            horario={horario}
            medicos={medicosDoHorario}
            enviando={enviando}
            onAgendar={reservar}
          />
        )}

        {passo === 4 && reserva && (
          <PassoPagamento reserva={reserva} enviando={enviando} onPagar={pagar} onExpirar={voltar} />
        )}
      </main>

      {passo <= 2 && (
        <BarraAcao
          rotulo="CONTINUAR"
          desabilitado={passo === 1 ? !slug : !horario}
          onClick={passo === 1 ? irParaDataEHorario : () => setPasso(3)}
        />
      )}
    </>
  );
}

function Stepper({ atual }: { atual: Passo }) {
  return (
    <section className="py-6 mb-8">
      <div className="flex justify-between items-start">
        {PASSOS.map((label, i) => {
          const n = i + 1;
          const feito = n < atual;
          const ativo = n === atual;
          return (
            <div key={label} className="contents">
              {i > 0 && <div className="flex-grow h-[2px] bg-outline-variant mx-1 mt-4" />}
              <div className="flex flex-col items-center gap-2 w-16 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-md ${
                    ativo
                      ? "bg-primary-container text-white shadow-[0_0_0_4px_rgba(12,28,49,0.1)]"
                      : feito
                        ? "bg-secondary text-white"
                        : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {feito ? <Icon name="check" size={18} /> : n}
                </div>
                <span
                  className={`text-label-md font-label-md text-center leading-tight ${
                    ativo ? "text-primary" : "text-on-tertiary-container"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BarraAcao({
  rotulo,
  desabilitado,
  onClick,
}: {
  rotulo: string;
  desabilitado: boolean;
  onClick: () => void;
}) {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant px-5 py-6 z-50 flex justify-center shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
      <button
        onClick={onClick}
        disabled={desabilitado}
        className="w-full max-w-[390px] h-14 bg-primary-container text-white text-label-lg font-label-lg rounded-xl hover:bg-primary transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg"
      >
        {rotulo}
        <Icon name="arrow_forward" />
      </button>
    </footer>
  );
}

function PassoEspecialidade({
  especialidades,
  selecionada,
  onSelecionar,
}: {
  especialidades: Specialty[];
  selecionada: string | null;
  onSelecionar: (slug: string) => void;
}) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-headline-md font-headline-md text-primary mb-2">Escolha a especialidade</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Selecione o tipo de atendimento que você deseja realizar.
        </p>
      </section>

      <section className="space-y-4">
        {especialidades.map((s) => {
          const ativo = s.slug === selecionada;
          return (
            <button
              key={s.slug}
              onClick={() => onSelecionar(s.slug)}
              aria-pressed={ativo}
              className={`w-full text-left rounded-xl p-5 border transition-all ${
                ativo
                  ? "border-secondary bg-surface-container-low"
                  : "border-outline-variant bg-surface-container-lowest hover:shadow-sm"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    ativo ? "bg-primary-container text-white" : "bg-surface-container-low text-primary"
                  }`}
                >
                  <Icon name={specialtyIcon(s.slug)} size={28} />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-body-lg font-bold text-primary mb-1">{s.name}</h3>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    {BLURB[s.slug] ?? "Atendimento especializado com a equipe do Instituto."}
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    ativo ? "border-secondary bg-secondary opacity-100" : "border-outline-variant opacity-0"
                  }`}
                >
                  <Icon name="check" className="text-white" size={16} />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <section className="mt-8 p-6 bg-surface-container-low rounded-xl">
        <h4 className="text-label-lg font-label-lg text-primary mb-4 flex items-center gap-2">
          <Icon name="info" size={20} />
          Sobre as consultas
        </h4>
        <ul className="space-y-3">
          {[
            "Atendimento presencial ou por teleconsulta",
            "Consultas particulares com emissão de nota",
            "Retorno incluso em até 30 dias",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <Icon name="check_circle" className="text-secondary" size={18} />
              <span className="text-body-sm font-body-sm text-on-surface-variant">{t}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function PassoDataEHorario({
  disponibilidade,
  dia,
  horario,
  onDia,
  onHorario,
}: {
  disponibilidade: Disponibilidade | null;
  dia: string | null;
  horario: Horario | null;
  onDia: (d: string) => void;
  onHorario: (h: Horario) => void;
}) {
  if (!disponibilidade) return null;

  if (disponibilidade.dias.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon name="event_busy" className="text-on-tertiary-container" size={40} />
        <p className="text-body-md font-body-md text-on-surface">
          Sem horários livres em {disponibilidade.especialidade.name} nos próximos dias.
        </p>
        <p className="text-body-sm font-body-sm text-on-surface-variant max-w-xs">
          Volte um passo e tente outra especialidade.
        </p>
      </div>
    );
  }

  const diaAtual = disponibilidade.dias.find((d) => d.data === dia) ?? disponibilidade.dias[0];

  return (
    <>
      <section className="mb-6">
        <h2 className="text-headline-md font-headline-md text-primary mb-2">Escolha data e horário</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          {disponibilidade.especialidade.name} · horários livres nos próximos 14 dias.
        </p>
      </section>

      <section className="mb-8">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {disponibilidade.dias.map((d) => {
            const { diaSemana, dia: num, mes } = rotuloDia(d.data);
            const ativo = d.data === diaAtual.data;
            return (
              <button
                key={d.data}
                onClick={() => onDia(d.data)}
                aria-pressed={ativo}
                className={`flex flex-col items-center justify-center w-16 h-20 rounded-xl border shrink-0 transition-all ${
                  ativo
                    ? "border-secondary bg-primary-container text-white"
                    : "border-outline-variant bg-surface-container-lowest text-primary"
                }`}
              >
                <span className="text-label-md font-label-md capitalize opacity-70">{diaSemana}</span>
                <span className="text-headline-sm font-headline-sm">{num}</span>
                <span className="text-label-md font-label-md opacity-70">{mes}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider mb-4">
          {dataExtenso(diaAtual.data)}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {diaAtual.horarios.map((h) => {
            const ativo = horario?.iso === h.iso;
            return (
              <button
                key={h.iso}
                onClick={() => onHorario(h)}
                aria-pressed={ativo}
                className={`h-12 rounded-xl border text-label-lg font-label-lg transition-all ${
                  ativo
                    ? "border-secondary bg-secondary text-white"
                    : "border-outline-variant bg-surface-container-lowest text-primary hover:border-secondary"
                }`}
              >
                {h.hora}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-body-sm font-body-sm text-on-surface-variant">
          {horario
            ? `${horario.medicoIds.length} médico(s) disponível(is) às ${horario.hora}.`
            : "Toque num horário para ver quem atende."}
        </p>
      </section>
    </>
  );
}

function PassoMedico({
  especialidade,
  horario,
  medicos,
  enviando,
  onAgendar,
}: {
  especialidade: Specialty | null;
  horario: Horario;
  medicos: Medico[];
  enviando: boolean;
  onAgendar: (m: Medico) => void;
}) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-headline-md font-headline-md text-primary mb-2">Escolha o médico</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          {especialidade?.name ?? ""} · {dataExtenso(horario.iso.slice(0, 10))} às {horario.hora}
        </p>
      </section>

      <section className="space-y-4">
        {medicos.map((m) => (
          <article
            key={m.id}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 brand-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              <Avatar name={m.nome} size={56} />
              <div className="flex-grow min-w-0">
                <h3 className="text-body-lg font-bold text-primary">{m.nome}</h3>
                <p className="text-label-md font-label-md text-on-surface-variant mb-1">
                  {m.crm} · {m.yearsExp} anos de experiência
                </p>
                <p className="flex items-center gap-1 text-label-md font-label-md text-secondary">
                  <Icon name="star" filled size={16} /> {m.rating.toFixed(1)}
                </p>
              </div>
              <span className="text-body-lg font-bold text-primary shrink-0">{money(m.priceCents)}</span>
            </div>

            <p className="text-body-sm font-body-sm text-on-surface-variant mb-5">{m.bio}</p>

            <button
              onClick={() => onAgendar(m)}
              disabled={enviando}
              className="w-full h-12 bg-primary text-on-primary rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              {enviando ? "RESERVANDO…" : `AGENDAR ÀS ${horario.hora}`}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}

function PassoPagamento({
  reserva,
  enviando,
  onPagar,
  onExpirar,
}: {
  reserva: Reserva;
  enviando: boolean;
  onPagar: () => void;
  onExpirar: () => void;
}) {
  const [restante, setRestante] = useState(() => contagemRegressiva(reserva.holdUntil));
  const [expirou, setExpirou] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const txt = contagemRegressiva(reserva.holdUntil);
      setRestante(txt);
      if (txt === "0:00") {
        setExpirou(true);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [reserva.holdUntil]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(reserva.pagamento.pixCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão de área de transferência: o código segue visível na tela */
    }
  };

  if (expirou) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Icon name="timer_off" className="text-error" size={40} />
        <p className="text-body-md font-body-md text-on-surface">Sua reserva expirou.</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant max-w-xs">
          O horário voltou a ficar disponível para outros pacientes.
        </p>
        <button
          onClick={onExpirar}
          className="h-12 px-6 bg-primary-container text-white rounded-xl text-label-lg font-label-lg"
        >
          ESCOLHER OUTRO HORÁRIO
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="mb-6">
        <h2 className="text-headline-md font-headline-md text-primary mb-2">Pagamento</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Seu horário está reservado por <strong className="text-secondary">{restante}</strong>.
        </p>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 brand-shadow mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={reserva.medico} size={48} />
          <div className="min-w-0">
            <p className="text-label-lg font-label-lg text-primary truncate">{reserva.medico}</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">{reserva.especialidade}</p>
          </div>
        </div>
        <dl className="space-y-2">
          <Linha termo="Quando" valor={`${dataExtenso(reserva.startsAt.slice(0, 10))} às ${timeLabel(reserva.startsAt)}`} />
          <Linha termo="Duração" valor={`${reserva.durationMin} minutos`} />
          <Linha termo="Formato" valor={reserva.mode === "VIDEO" ? "Teleconsulta" : "Presencial"} />
          <Linha termo="Valor" valor={money(reserva.pagamento.amountCents)} destaque />
        </dl>
      </section>

      <section className="rounded-xl bg-surface-container-low p-5 mb-6">
        <h3 className="text-label-lg font-label-lg text-primary mb-3 flex items-center gap-2">
          <Icon name="qr_code_2" size={20} /> PIX copia e cola
        </h3>
        <p className="font-mono text-[11px] leading-relaxed text-on-surface-variant break-all bg-surface-container-lowest rounded-lg p-3 mb-3">
          {reserva.pagamento.pixCode}
        </p>
        <button
          onClick={copiar}
          className="w-full h-11 rounded-xl border border-outline-variant text-label-lg font-label-lg text-primary active:scale-95 transition-transform"
        >
          {copiado ? "CÓDIGO COPIADO ✓" : "COPIAR CÓDIGO"}
        </button>
      </section>

      <button
        onClick={onPagar}
        disabled={enviando}
        className="w-full h-14 bg-secondary text-white rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50"
      >
        {enviando ? "CONFIRMANDO…" : "SIMULAR PAGAMENTO"}
      </button>
      <p className="mt-3 text-center text-body-sm font-body-sm text-on-surface-variant">
        Modo demonstração: o gateway real entra na próxima fase.
      </p>
    </>
  );
}

function Linha({ termo, valor, destaque }: { termo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-body-sm font-body-sm text-on-surface-variant shrink-0">{termo}</dt>
      <dd
        className={`text-body-sm font-body-sm text-right ${
          destaque ? "text-primary font-bold" : "text-on-surface"
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}

function Confirmado({ confirmacao }: { confirmacao: Confirmacao }) {
  return (
    <main className="w-full max-w-[560px] mx-auto px-5 py-16 flex flex-col items-center text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
        <Icon name="check_circle" filled className="text-secondary" size={44} />
      </div>
      <h1 className="text-headline-md font-headline-md text-primary">Consulta confirmada</h1>
      <p className="text-body-md font-body-md text-on-surface-variant">
        {confirmacao.especialidade} com {confirmacao.medico}
      </p>
      <p className="text-body-md font-body-md text-on-surface">
        {dataExtenso(confirmacao.startsAt.slice(0, 10))} às {timeLabel(confirmacao.startsAt)} ·{" "}
        {confirmacao.mode === "VIDEO" ? "teleconsulta" : "presencial"}
      </p>

      <div className="w-full flex flex-col gap-3 mt-6">
        <Link
          href={`/paciente/consultas/${confirmacao.consultaId}`}
          className="h-14 bg-primary-container text-white rounded-xl text-label-lg font-label-lg flex items-center justify-center"
        >
          VER DETALHES
        </Link>
        <Link
          href="/paciente"
          className="h-14 rounded-xl border border-outline-variant text-primary text-label-lg font-label-lg flex items-center justify-center"
        >
          VOLTAR AO INÍCIO
        </Link>
      </div>
    </main>
  );
}

export default function AgendarPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AgendarFlow />
    </Suspense>
  );
}
