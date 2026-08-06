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
  assinaturaIcpEm: string | null;
  assinaturaIcpTitular: string | null;
  assinaturaIcpSerial: string | null;
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
            {r.assinaturaIcpEm ? (
              <div className="text-[11px] font-body-sm text-secondary mt-0.5 flex items-center gap-1">
                <Icon name="verified" filled size={12} /> assinado ICP
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

type Assinatura = { em: string; titular: string | null; serial: string | null };

function Formulario({ doctorId, registro }: { doctorId: string; registro: Registro }) {
  const [resumo, setResumo] = useState(registro.resumoClinico ?? "");
  const [condutas, setCondutas] = useState(registro.condutas ?? "");
  const [especial, setEspecial] = useState(registro.receituarioEspecial);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<string | null>(registro.prontuarioEmAt);
  const [erro, setErro] = useState<string | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(
    registro.assinaturaIcpEm
      ? { em: registro.assinaturaIcpEm, titular: registro.assinaturaIcpTitular, serial: registro.assinaturaIcpSerial }
      : null
  );

  // Assinado = documento fechado. Vale para o registro que já chegou assinado do
  // banco e para o que acabou de ser assinado nesta tela.
  const assinado = assinatura !== null;

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
      if (d.assinaturaIcpEm) {
        setAssinatura({ em: d.assinaturaIcpEm, titular: d.assinaturaIcpTitular, serial: d.assinaturaIcpSerial });
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
        {salvo && !assinado && (
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
          disabled={assinado}
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
          disabled={assinado}
          placeholder="Prescrição, exames solicitados, orientações, retorno…"
          maxLength={4000}
          className={campoClasse}
        />
      </div>

      {!assinado && (
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
                Ao salvar, o documento é assinado com seu certificado e fica travado — depois disso
                não dá mais para editar este registro.
              </p>
            )}
          </div>
        </>
      )}

      <p className="text-body-sm font-body-sm text-on-surface-variant">
        {assinado
          ? "Documento assinado. O paciente vê o registro e o selo de assinatura na tela desta consulta."
          : "Isso aparece para o paciente na tela desta consulta assim que você salvar."}
      </p>

      {!assinado && (
        <button
          onClick={salvar}
          disabled={salvando}
          className="sd-aurora h-12 px-6 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
        >
          {salvando ? (especial ? "ASSINANDO…" : "SALVANDO…") : especial ? "ASSINAR E SALVAR" : "SALVAR PRONTUÁRIO"}
          {!salvando && <Icon name={especial ? "verified" : "save"} size={18} />}
        </button>
      )}
    </div>
  );
}

function SeloAssinatura({ assinatura }: { assinatura: Assinatura }) {
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
          <dt className="font-semibold">Certificado:</dt>
          <dd className="font-mono">{assinatura.serial ?? "—"}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">Assinado em:</dt>
          <dd>{new Date(assinatura.em).toLocaleString("pt-BR")}</dd>
        </div>
      </dl>
      <p className="text-[11px] font-body-sm text-on-surface-variant pt-1 border-t border-outline-variant/40">
        Amostra: assinatura simulada, sem Autoridade Certificadora real e sem validade jurídica.
      </p>
    </section>
  );
}
