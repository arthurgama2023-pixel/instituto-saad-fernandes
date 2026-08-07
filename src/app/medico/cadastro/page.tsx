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
  email: string;
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
  nome: "", email: "", whatsapp: "", crmNumero: "", uf: "", especialidadeSlug: "",
  anosExperiencia: "", precoReais: "", modalidade: "VIDEO", bio: "",
};

export default function CadastroMedico() {
  const [especialidades, setEspecialidades] = useState<{ slug: string; name: string }[] | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [docName, setDocName] = useState<string>();
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSenha, setCertSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<{ nome: string; especialidade: string; certificadoAceito: boolean } | null>(null);

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
      const fd = new FormData();
      fd.set("nome", form.nome);
      fd.set("email", form.email);
      fd.set("whatsapp", form.whatsapp);
      fd.set("crmNumero", form.crmNumero);
      fd.set("uf", form.uf);
      fd.set("especialidadeSlug", form.especialidadeSlug);
      fd.set("anosExperiencia", String(Number(form.anosExperiencia) || 0));
      fd.set("precoReais", String(Number(form.precoReais) || 0));
      fd.set("modalidade", form.modalidade);
      fd.set("bio", form.bio);
      if (certFile) fd.set("certArquivo", certFile);
      if (certSenha) fd.set("certSenha", certSenha);

      const r = await fetch("/api/medico/cadastro", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.error ?? "Não consegui enviar o cadastro. Tente de novo.");
        return;
      }
      setPronto({ nome: d.nome, especialidade: d.especialidade, certificadoAceito: Boolean(d.certificadoAceito) });
    } catch {
      setErro("Não consegui enviar o cadastro. Verifique a conexão.");
    } finally {
      setEnviando(false);
    }
  };

  if (pronto)
    return (
      <Enviado
        nome={pronto.nome}
        especialidade={pronto.especialidade}
        comDocumento={!!docName}
        certificadoAceito={pronto.certificadoAceito}
      />
    );
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

          <Field label="E-mail" htmlFor="email" hint="Onde você recebe as notificações de consulta (confirmação, cancelamento e lembrete).">
            <TextInput id="email" value={form.email} onChange={set("email")} placeholder="voce@exemplo.com" inputMode="email" autoComplete="email" />
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

          <div className="pt-2 border-t border-outline-variant/50" />

          <section className="space-y-4">
            <div>
              <h3 className="text-label-lg font-label-lg text-primary">Certificado digital (ICP-Brasil)</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                Opcional. Se você já tem um certificado A1 (.pfx), cadastre agora e suas receitas e atestados já
                saem assinados digitalmente desde o primeiro dia. Pode fazer isso depois também, em Configurações.
              </p>
            </div>

            <FileField
              label="Arquivo do certificado (.pfx / .p12)"
              fileName={certFile?.name}
              onFile={setCertFile}
              accept=".pfx,.p12,application/x-pkcs12"
              placeholder="Enviar certificado A1"
            />

            {certFile && (
              <Field label="Senha do certificado" htmlFor="cert-senha">
                <TextInput
                  id="cert-senha"
                  type="password"
                  value={certSenha}
                  onChange={(e) => setCertSenha(e.target.value)}
                  autoComplete="off"
                />
              </Field>
            )}
          </section>
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

function Enviado({
  nome,
  especialidade,
  comDocumento,
  certificadoAceito,
}: {
  nome: string;
  especialidade: string;
  comDocumento: boolean;
  certificadoAceito: boolean;
}) {
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
      {certificadoAceito && (
        <p className="flex items-center gap-2 text-body-sm font-body-sm text-secondary">
          <Icon name="verified_user" filled size={16} /> Certificado digital cadastrado — seus documentos já saem assinados.
        </p>
      )}
      <div className="w-full flex flex-col gap-3 mt-6">
        <Link href="/medico/login" className="h-14 bg-primary-container text-white rounded-xl text-label-lg font-label-lg flex items-center justify-center">
          IR PARA O LOGIN
        </Link>
      </div>
    </main>
  );
}
