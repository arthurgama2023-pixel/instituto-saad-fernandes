"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { Field, FileField, Select, TextArea, TextInput } from "@/components/brand/Field";
import { Loading, PageHeader } from "@/components/brand/ui";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const MODALIDADES = [
  { value: "VIDEO", label: "Teleconsulta (vídeo)" },
  { value: "IN_PERSON", label: "Presencial" },
  { value: "BOTH", label: "Ambos" },
];

type Form = {
  nome: string;
  whatsapp: string;
  crmNumero: string;
  uf: string;
  especialidadeSlug: string;
  anosExperiencia: string;
  precoReais: string;
  modalidade: string;
  bio: string;
};

const EMPTY: Form = {
  nome: "", whatsapp: "", crmNumero: "", uf: "", especialidadeSlug: "",
  anosExperiencia: "", precoReais: "", modalidade: "VIDEO", bio: "",
};

export default function CadastroMedico() {
  const [especialidades, setEspecialidades] = useState<{ slug: string; name: string }[] | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [docName, setDocName] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<{ nome: string; especialidade: string } | null>(null);

  useEffect(() => {
    fetch("/api/medico/cadastro")
      .then((r) => r.json())
      .then((d) => setEspecialidades(d.especialidades))
      .catch(() => setEspecialidades([]));
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const enviar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch("/api/medico/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          whatsapp: form.whatsapp,
          crmNumero: form.crmNumero,
          uf: form.uf,
          especialidadeSlug: form.especialidadeSlug,
          anosExperiencia: Number(form.anosExperiencia),
          precoReais: Number(form.precoReais),
          modalidade: form.modalidade,
          bio: form.bio,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.error ?? "Não consegui enviar o cadastro. Tente de novo.");
        return;
      }
      setPronto({ nome: d.nome, especialidade: d.especialidade });
    } catch {
      setErro("Não consegui enviar o cadastro. Verifique a conexão.");
    } finally {
      setEnviando(false);
    }
  };

  if (pronto) return <Enviado nome={pronto.nome} especialidade={pronto.especialidade} comDocumento={!!docName} />;
  if (!especialidades) return <Loading />;

  return (
    <>
      <PageHeader title="Cadastro de médico" />

      <main className="w-full max-w-[560px] mx-auto px-5 pb-32">
        <section className="mb-8">
          <h2 className="text-headline-md font-headline-md text-primary mb-2">Faça parte do Smart Doctor</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Amostra — nenhum campo é obrigatório. Preencha o que quiser e envie para ver como fica o fluxo.
          </p>
        </section>

        {erro && (
          <p role="alert" className="mb-6 flex items-start gap-2 p-4 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
            <Icon name="error" size={18} /> {erro}
          </p>
        )}

        <div className="space-y-6">
          <Field label="Nome completo" htmlFor="nome">
            <TextInput id="nome" value={form.nome} onChange={set("nome")} placeholder="Dr(a). Nome Sobrenome" autoComplete="name" />
          </Field>

          <Field label="WhatsApp" htmlFor="wpp" hint="Usamos para avisar sobre consultas e chamados.">
            <TextInput id="wpp" value={form.whatsapp} onChange={set("whatsapp")} placeholder="(11) 99999-9999" inputMode="tel" />
          </Field>

          <div className="grid grid-cols-[1fr_92px] gap-3">
            <Field label="Número do CRM" htmlFor="crm">
              <TextInput id="crm" value={form.crmNumero} onChange={set("crmNumero")} placeholder="123456" inputMode="numeric" />
            </Field>
            <Field label="UF" htmlFor="uf">
              <Select id="uf" placeholder="—" value={form.uf} onChange={set("uf")} options={UFS.map((u) => ({ value: u, label: u }))} />
            </Field>
          </div>

          <Field label="Especialidade" htmlFor="esp">
            <Select
              id="esp"
              placeholder="Selecione a especialidade"
              value={form.especialidadeSlug}
              onChange={set("especialidadeSlug")}
              options={especialidades.map((e) => ({ value: e.slug, label: e.name }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Anos de experiência" htmlFor="exp">
              <TextInput id="exp" value={form.anosExperiencia} onChange={set("anosExperiencia")} placeholder="Ex.: 8" inputMode="numeric" />
            </Field>
            <Field label="Valor da consulta (R$)" htmlFor="preco">
              <TextInput id="preco" value={form.precoReais} onChange={set("precoReais")} placeholder="Ex.: 250" inputMode="decimal" />
            </Field>
          </div>

          <Field label="Modalidade de atendimento" htmlFor="mod">
            <Select id="mod" value={form.modalidade} onChange={set("modalidade")} options={MODALIDADES} />
          </Field>

          <Field label="Apresentação" htmlFor="bio" hint="Como você se apresenta ao paciente.">
            <TextArea id="bio" value={form.bio} onChange={set("bio")} placeholder="Fale sobre sua formação, abordagem e experiência." maxLength={600} />
          </Field>

          <FileField
            label="Documento de identificação profissional"
            hint="Foto da carteira do CRM ou do diploma. Usado só na verificação."
            fileName={docName}
            onFile={(f) => setDocName(f?.name)}
          />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant px-5 py-6 z-50 flex flex-col items-center gap-2 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
        <button
          onClick={enviar}
          disabled={enviando}
          className="sd-aurora w-full max-w-[390px] h-14 text-label-lg font-label-lg rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg"
        >
          {enviando ? "ENVIANDO…" : "ENVIAR CADASTRO"}
          {!enviando && <Icon name="arrow_forward" />}
        </button>
      </footer>
    </>
  );
}

// Ignora o título (Dr./Dra.) e devolve o primeiro nome de verdade.
function primeiroNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => !/^dr[a]?\.?$/i.test(p));
  return partes[0] ?? nome;
}

function Enviado({ nome, especialidade, comDocumento }: { nome: string; especialidade: string; comDocumento: boolean }) {
  return (
    <main className="w-full max-w-[560px] mx-auto px-5 py-16 flex flex-col items-center text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
        <Icon name="how_to_reg" filled className="text-secondary" size={44} />
      </div>
      <h1 className="text-headline-md font-headline-md text-primary">Cadastro enviado</h1>
      <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">
        Obrigado, {primeiroNome(nome)}. Recebemos seu cadastro em {especialidade}
        {comDocumento ? " e seus documentos" : ""}. Em breve nosso time entra em contato pelo WhatsApp — a
        verificação do seu registro no CFM leva até 24h.
      </p>
      <div className="w-full flex flex-col gap-3 mt-6">
        <Link href="/medico/login" className="h-14 bg-primary-container text-white rounded-xl text-label-lg font-label-lg flex items-center justify-center">
          IR PARA O LOGIN
        </Link>
      </div>
    </main>
  );
}
