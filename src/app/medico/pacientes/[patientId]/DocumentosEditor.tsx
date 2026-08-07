"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/brand/Icon";

const TIPOS = [
  { value: "RECEITA", label: "Receita" },
  { value: "ATESTADO", label: "Atestado" },
  { value: "EXAME", label: "Exame" },
  { value: "OUTRO", label: "Outro documento" },
];

type DocItem = {
  id: string;
  tipo: string;
  titulo: string;
  arquivoNome: string | null;
  emitidoEm: string;
  lidoEm: string | null;
};

export function DocumentosEditor({ doctorId, patientId }: { doctorId: string; patientId: string }) {
  const [tipo, setTipo] = useState("RECEITA");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = () => {
    fetch(`/api/medico/documentos?doctorId=${doctorId}&patientId=${patientId}`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documentos ?? []))
      .catch(() => setDocs([]));
  };
  useEffect(carregar, [doctorId, patientId]);

  const enviar = async () => {
    setErro(null);
    setOk(false);
    if (!titulo.trim()) return setErro("Dê um título ao documento.");
    const file = fileRef.current?.files?.[0];
    if (!conteudo.trim() && !file) return setErro("Escreva um texto ou anexe um arquivo.");

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("tipo", tipo);
      fd.set("titulo", titulo.trim());
      fd.set("conteudo", conteudo.trim());
      fd.set("doctorId", doctorId);
      fd.set("patientId", patientId);
      if (file) fd.set("arquivo", file);

      const r = await fetch("/api/medico/documentos", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.error ?? "Não consegui enviar. Tente de novo.");
        return;
      }
      setOk(true);
      setTitulo("");
      setConteudo("");
      if (fileRef.current) fileRef.current.value = "";
      carregar();
    } catch {
      setErro("Não consegui enviar. Verifique a conexão.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-headline-sm font-headline-sm text-primary mb-1">Documentos</h2>
      <p className="text-body-sm font-body-sm text-on-surface-variant mb-5">
        Envie receita, atestado ou exame — chega no app do paciente (aba Exames e documentos) e ele recebe um
        aviso por e-mail.
      </p>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow p-6 space-y-5">
        {erro && (
          <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
            <Icon name="error" size={18} /> {erro}
          </p>
        )}
        {ok && (
          <p className="flex items-center gap-2 text-body-sm font-body-sm text-secondary">
            <Icon name="check_circle" filled size={16} /> Documento enviado ao paciente.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
          <div className="space-y-2">
            <label htmlFor="doc-tipo" className="text-label-lg font-label-lg text-primary">Tipo</label>
            <select
              id="doc-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full h-12 px-3 rounded-xl border border-outline-variant bg-surface-container text-body-md font-body-md text-on-surface focus:border-secondary focus:outline-none"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="doc-titulo" className="text-label-lg font-label-lg text-primary">Título</label>
            <input
              id="doc-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Receita — Minoxidil 5%"
              maxLength={140}
              className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container focus:border-secondary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="doc-conteudo" className="text-label-lg font-label-lg text-primary">Texto do documento</label>
          <textarea
            id="doc-conteudo"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Prescrição, período de afastamento, orientações…"
            maxLength={4000}
            className="w-full min-h-[120px] p-4 rounded-xl border border-outline-variant bg-surface-container text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container resize-y focus:border-secondary focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="doc-arquivo" className="text-label-lg font-label-lg text-primary">
            Anexar arquivo <span className="text-on-surface-variant font-body-sm">(opcional · PDF ou imagem, até 5 MB)</span>
          </label>
          <input
            id="doc-arquivo"
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="block w-full text-body-sm text-on-surface-variant file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-secondary-container file:text-on-secondary-container file:text-label-md file:font-label-md"
          />
        </div>

        <button
          onClick={enviar}
          disabled={enviando}
          className="sd-aurora h-12 px-6 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
        >
          {enviando ? "ENVIANDO…" : "ENVIAR AO PACIENTE"}
          {!enviando && <Icon name="send" size={18} />}
        </button>
      </div>

      {docs.length > 0 && (
        <div className="mt-5 space-y-2">
          <h3 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">Enviados</h3>
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50">
              <Icon name={d.arquivoNome ? "attach_file" : "description"} size={18} className="text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-body-md text-on-surface truncate">{d.titulo}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {new Date(d.emitidoEm).toLocaleString("pt-BR")}
                </p>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${d.lidoEm ? "text-on-surface-variant border border-outline-variant" : "bg-secondary-container text-on-secondary-container"}`}>
                {d.lidoEm ? "lido" : "não lido"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
