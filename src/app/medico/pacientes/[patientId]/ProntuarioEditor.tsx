"use client";

import { useState } from "react";
import { Icon } from "@/components/brand/Icon";

type Registro = {
  id: string;
  startsAtLabel: string;
  status: string;
  especialidade: string;
  resumoClinico: string | null;
  condutas: string | null;
  prontuarioEmAt: string | null;
  receituarioEspecial: boolean;
  assinaturaIcpStatus: string | null;
  assinaturaIcpEm: string | null;
  assinaturaIcpTitular: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  CONCLUIDA: "Concluída",
  CONFIRMADA: "Confirmada",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  CANCELADA: "Cancelada",
  EXPIRADA: "Expirada",
  NO_SHOW: "Não compareceu",
};

export function ProntuarioEditor({ doctorId, registros }: { doctorId: string; registros: Registro[] }) {
  // Abre já editando a consulta mais recente — é a mais provável de precisar
  // de anotação logo depois do atendimento.
  const [selecionadoId, setSelecionadoId] = useState(registros[0].id);
  const selecionado = registros.find((r) => r.id === selecionadoId) ?? registros[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
      <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {registros.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelecionadoId(r.id)}
            className={`shrink-0 text-left px-4 py-3 rounded-xl border transition-colors ${
              r.id === selecionadoId
                ? "border-secondary bg-secondary-container/50 text-on-secondary-container"
                : "border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:border-secondary/50"
            }`}
          >
            <div className="text-label-md font-label-md">{r.startsAtLabel}</div>
            <div className="text-[11px] font-body-sm">{STATUS_LABEL[r.status] ?? r.status}</div>
            {r.assinaturaIcpStatus === "ASSINADO" ? (
              <div className="text-[11px] font-body-sm text-secondary mt-0.5 flex items-center gap-1">
                <Icon name="verified" filled size={12} /> assinado ICP
              </div>
            ) : r.assinaturaIcpStatus === "AGUARDANDO_ASSINATURA" ? (
              <div className="text-[11px] font-body-sm text-amber-600 mt-0.5 flex items-center gap-1">
                <Icon name="hourglass_top" size={12} /> aguardando ICP
              </div>
            ) : (
              r.resumoClinico && (
                <div className="text-[11px] font-body-sm text-secondary mt-0.5 flex items-center gap-1">
                  <Icon name="check_circle" filled size={12} /> preenchido
                </div>
              )
            )}
          </button>
        ))}
      </nav>

      <Formulario key={selecionado.id} doctorId={doctorId} registro={selecionado} />
    </div>
  );
}

type Assinatura = { status: string; em: string | null; titular: string | null };

function Formulario({ doctorId, registro }: { doctorId: string; registro: Registro }) {
  const [resumo, setResumo] = useState(registro.resumoClinico ?? "");
  const [condutas, setCondutas] = useState(registro.condutas ?? "");
  const [especial, setEspecial] = useState(registro.receituarioEspecial);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<string | null>(registro.prontuarioEmAt);
  const [erro, setErro] = useState<string | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(
    registro.assinaturaIcpStatus
      ? { status: registro.assinaturaIcpStatus, em: registro.assinaturaIcpEm, titular: registro.assinaturaIcpTitular }
      : null
  );

  // Enviado pro Clicksign (aguardando ou já assinado) = documento travado.
  // A diferença entre os dois estados é só o selo que aparece.
  const travado = assinatura !== null;
  const jaAssinado = assinatura?.status === "ASSINADO";

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/medico/prontuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: registro.id,
          doctorId,
          resumoClinico: resumo,
          condutas,
          receituarioEspecial: especial,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.error ?? "Não consegui salvar. Tente de novo.");
        return;
      }
      setSalvo(d.prontuarioEmAt);
      if (d.assinaturaIcpStatus) {
        setAssinatura({ status: d.assinaturaIcpStatus, em: d.assinaturaIcpEm, titular: d.assinaturaIcpTitular });
      }
    } catch {
      setErro("Não consegui salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  };

  const campoClasse =
    "w-full min-h-[140px] p-4 rounded-xl border border-outline-variant bg-surface-container text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container resize-y focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-colors disabled:opacity-70 disabled:cursor-not-allowed";

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-headline-sm font-headline-sm text-primary">
          {registro.especialidade} · {registro.startsAtLabel}
        </h2>
        {salvo && !travado && (
          <span className="text-body-sm font-body-sm text-secondary flex items-center gap-1">
            <Icon name="check_circle" filled size={16} /> salvo em {new Date(salvo).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {erro && (
        <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
          <Icon name="error" size={18} /> {erro}
        </p>
      )}

      {assinatura && <SeloAssinatura assinatura={assinatura} />}

      <div className="space-y-2">
        <label htmlFor="resumo" className="text-label-lg font-label-lg text-primary">
          Resumo clínico
        </label>
        <textarea
          id="resumo"
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          disabled={travado}
          placeholder="Queixa, histórico, exame, hipótese diagnóstica…"
          maxLength={4000}
          className={campoClasse}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="condutas" className="text-label-lg font-label-lg text-primary">
          Condutas &amp; recomendações
        </label>
        <textarea
          id="condutas"
          value={condutas}
          onChange={(e) => setCondutas(e.target.value)}
          disabled={travado}
          placeholder="Prescrição, exames solicitados, orientações, retorno…"
          maxLength={4000}
          className={campoClasse}
        />
      </div>

      {!travado && (
        <>
          {/* Receituário especial é o único caso em que a assinatura ICP-Brasil
              faz falta: a receita comum já sai assinada pela própria prescrição
              digital. Por isso a opção fica desmarcada por padrão. */}
          <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
            <label htmlFor="especial" className="flex items-start gap-3 cursor-pointer">
              <input
                id="especial"
                type="checkbox"
                checked={especial}
                onChange={(e) => setEspecial(e.target.checked)}
                className="mt-1 w-5 h-5 shrink-0 accent-secondary cursor-pointer"
              />
              <span>
                <span className="block text-label-lg font-label-lg text-primary">
                  Receituário especial (substância controlada)
                </span>
                <span className="block text-body-sm font-body-sm text-on-surface-variant mt-0.5">
                  Exige assinatura digital ICP-Brasil. Marque só quando prescrever medicamento de
                  controle especial — a receita comum não precisa disso.
                </span>
              </span>
            </label>

            {especial && (
              <p className="flex items-start gap-2 rounded-lg bg-error-container/60 text-on-error-container p-3 text-body-sm font-body-sm">
                <Icon name="lock" size={18} className="shrink-0 mt-0.5" />
                Ao salvar, o documento vai pro Clicksign e o registro fica travado — você vai
                precisar assinar com o SEU certificado ICP-Brasil (link chega por WhatsApp) pra
                concluir. Depois de enviado, não dá mais para editar este registro.
              </p>
            )}
          </div>
        </>
      )}

      <p className="text-body-sm font-body-sm text-on-surface-variant">
        {jaAssinado
          ? "Documento assinado. O paciente vê o registro e o selo de assinatura na tela desta consulta."
          : travado
            ? "Enviado para assinatura. Confira o WhatsApp cadastrado para concluir com seu certificado ICP-Brasil."
            : "Isso aparece para o paciente na tela desta consulta assim que você salvar."}
      </p>

      {!travado && (
        <button
          onClick={salvar}
          disabled={salvando}
          className="sd-aurora h-12 px-6 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
        >
          {salvando ? (especial ? "ENVIANDO PARA ASSINATURA…" : "SALVANDO…") : especial ? "ENVIAR PARA ASSINATURA (ICP-BRASIL)" : "SALVAR PRONTUÁRIO"}
          {!salvando && <Icon name={especial ? "verified" : "save"} size={18} />}
        </button>
      )}
    </div>
  );
}

function SeloAssinatura({ assinatura }: { assinatura: Assinatura }) {
  if (assinatura.status === "AGUARDANDO_ASSINATURA") {
    return (
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
        <h3 className="flex items-center gap-2 text-label-lg font-label-lg text-on-secondary-container">
          <Icon name="hourglass_top" size={20} className="text-amber-600" />
          Aguardando assinatura digital
        </h3>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Enviado para <b>{assinatura.titular ?? "o médico"}</b> assinar com o certificado ICP-Brasil
          dele. O Clicksign mandou o link de assinatura por WhatsApp — o registro fica travado até a
          assinatura ser concluída.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-secondary-fixed/40 bg-secondary-container/30 p-4 space-y-2">
      <h3 className="flex items-center gap-2 text-label-lg font-label-lg text-on-secondary-container">
        <Icon name="verified" filled size={20} className="text-secondary" />
        Receituário especial assinado digitalmente
      </h3>
      <dl className="text-body-sm font-body-sm text-on-surface-variant space-y-1">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">Titular:</dt>
          <dd>{assinatura.titular ?? "—"}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">Assinado em:</dt>
          <dd>{assinatura.em ? new Date(assinatura.em).toLocaleString("pt-BR") : "—"}</dd>
        </div>
      </dl>
      <p className="text-[11px] font-body-sm text-on-surface-variant pt-1 border-t border-outline-variant/40">
        Assinado via Clicksign com certificado digital ICP-Brasil do médico.
      </p>
    </section>
  );
}
