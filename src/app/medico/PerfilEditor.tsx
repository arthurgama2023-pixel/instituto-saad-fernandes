"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";

type Especialidade = { id: string; name: string };

type Perfil = {
  name: string;
  email: string;
  whatsapp: string;
  crmNumero: string;
  uf: string;
  specialtyId: string;
  bio: string;
  yearsExp: number;
  priceReais: number;
  durationMin: number;
  mode: "VIDEO" | "IN_PERSON" | "BOTH";
  rating: number;
  status: string;
  especialidades: Especialidade[];
  naoAutenticado?: boolean;
};

const inputWrap =
  "flex items-center gap-3 h-12 px-4 rounded-xl border border-outline-variant/60 bg-surface-container focus-within:border-secondary transition-colors";
const inputEl =
  "flex-1 bg-transparent border-0 outline-none text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant/50";
const label = "text-label-md font-label-md text-on-surface-variant";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Ativo", PENDING: "Pendente de aprovação", SUSPENDED: "Suspenso" };
const MODE_LABEL: Record<string, string> = { VIDEO: "Teleconsulta (vídeo)", IN_PERSON: "Presencial", BOTH: "Ambos" };

export function PerfilEditor() {
  const [dados, setDados] = useState<Perfil | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const carregar = () => {
    fetch("/api/medico/perfil")
      .then(async (r) => ({ ...(await r.json()), naoAutenticado: r.status === 401 }))
      .then(setDados)
      .catch(() => setDados(null));
  };
  useEffect(carregar, []);

  const set = <K extends keyof Perfil>(campo: K, valor: Perfil[K]) => {
    setDados((d) => (d ? { ...d, [campo]: valor } : d));
    setOk(false);
  };

  const salvar = async () => {
    if (!dados) return;
    setErro(null);
    setOk(false);
    setSalvando(true);
    try {
      const r = await fetch("/api/medico/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dados.name,
          email: dados.email,
          whatsapp: dados.whatsapp,
          crmNumero: dados.crmNumero,
          uf: dados.uf,
          specialtyId: dados.specialtyId,
          bio: dados.bio,
          yearsExp: dados.yearsExp,
          priceReais: dados.priceReais,
          durationMin: dados.durationMin,
          mode: dados.mode,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.error ?? "Não consegui salvar.");
        return;
      }
      setOk(true);
    } catch {
      setErro("Não consegui salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  };

  if (!dados) return null;

  if (dados.naoAutenticado) {
    return (
      <section className="space-y-3">
        <h3 className="text-headline-sm font-headline-sm text-primary mb-1">Meu perfil</h3>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow p-6 flex items-start gap-3">
          <Icon name="lock" size={20} className="text-on-surface-variant mt-0.5" />
          <div>
            <p className="text-label-lg font-label-lg text-primary">Entre como médico</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Por segurança, só o médico autenticado edita o próprio perfil. Enquanto isso, os dados abaixo são
              só de visualização (do médico selecionado em &quot;Ver como&quot;).{" "}
              <Link href="/medico/login" className="text-secondary font-semibold">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-headline-sm font-headline-sm text-primary mb-1">Meu perfil</h3>
        <div className="flex items-center gap-2 text-body-sm font-body-sm">
          <span
            className={`px-3 py-1 rounded-full border text-[11px] font-bold ${
              dados.status === "ACTIVE"
                ? "bg-green-50 border-green-200 text-green-700"
                : dados.status === "PENDING"
                  ? "bg-secondary-container/50 border-secondary-fixed-dim text-on-secondary-container"
                  : "bg-surface-container border-outline-variant text-on-surface-variant"
            }`}
          >
            {STATUS_LABEL[dados.status] ?? dados.status}
          </span>
          <span className="flex items-center gap-1 text-on-surface-variant">
            <Icon name="star" filled size={16} className="text-amber-500" /> {dados.rating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 brand-shadow p-6 space-y-5">
        {erro && (
          <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-body-sm">
            <Icon name="error" size={18} /> {erro}
          </p>
        )}
        {ok && (
          <p className="flex items-center gap-2 text-body-sm font-body-sm text-secondary">
            <Icon name="check_circle" filled size={16} /> Perfil atualizado.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className={label}>Nome completo</label>
            <div className={inputWrap}>
              <Icon name="person" size={18} className="text-on-surface-variant" />
              <input className={inputEl} value={dados.name} onChange={(e) => set("name", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>E-mail</label>
            <div className={inputWrap}>
              <Icon name="alternate_email" size={18} className="text-on-surface-variant" />
              <input className={inputEl} type="email" value={dados.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>WhatsApp</label>
            <div className={inputWrap}>
              <Icon name="call" size={18} className="text-on-surface-variant" />
              <input className={inputEl} value={dados.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Número do CRM</label>
            <div className={inputWrap}>
              <input className={inputEl} value={dados.crmNumero} onChange={(e) => set("crmNumero", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>UF do CRM</label>
            <select
              className="w-full h-12 px-4 rounded-xl border border-outline-variant/60 bg-surface-container text-body-md font-body-md text-on-surface focus:border-secondary focus:outline-none"
              value={dados.uf}
              onChange={(e) => set("uf", e.target.value)}
            >
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Especialidade</label>
            <select
              className="w-full h-12 px-4 rounded-xl border border-outline-variant/60 bg-surface-container text-body-md font-body-md text-on-surface focus:border-secondary focus:outline-none"
              value={dados.specialtyId}
              onChange={(e) => set("specialtyId", e.target.value)}
            >
              {dados.especialidades.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Anos de experiência</label>
            <div className={inputWrap}>
              <input className={inputEl} type="number" min={0} max={70} value={dados.yearsExp} onChange={(e) => set("yearsExp", Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Valor da consulta (R$)</label>
            <div className={inputWrap}>
              <input className={inputEl} type="number" min={0} step="0.01" value={dados.priceReais} onChange={(e) => set("priceReais", Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Duração da consulta (min)</label>
            <div className={inputWrap}>
              <input className={inputEl} type="number" min={10} max={180} step={5} value={dados.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Modalidade de atendimento</label>
            <select
              className="w-full h-12 px-4 rounded-xl border border-outline-variant/60 bg-surface-container text-body-md font-body-md text-on-surface focus:border-secondary focus:outline-none"
              value={dados.mode}
              onChange={(e) => set("mode", e.target.value as Perfil["mode"])}
            >
              {(["VIDEO", "IN_PERSON", "BOTH"] as const).map((m) => (
                <option key={m} value={m}>{MODE_LABEL[m]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className={label}>Apresentação (bio)</label>
            <textarea
              className="w-full min-h-[100px] p-4 rounded-xl border border-outline-variant/60 bg-surface-container text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 resize-y focus:border-secondary focus:outline-none"
              value={dados.bio}
              onChange={(e) => set("bio", e.target.value)}
              maxLength={600}
              placeholder="Fale sobre sua formação, abordagem e experiência."
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={salvar}
            disabled={salvando || dados.name.trim().length < 2}
            className="sd-aurora h-12 px-6 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
          >
            {salvando ? "SALVANDO…" : "SALVAR PERFIL"}
            {!salvando && <Icon name="save" size={18} />}
          </button>

          <Link
            href="/api/medico/logout"
            className="h-12 px-6 rounded-xl border border-error/60 text-error text-label-lg font-label-lg flex items-center gap-2 hover:bg-error-container/40 transition-colors"
          >
            <Icon name="logout" size={18} /> Encerrar sessão
          </Link>
        </div>
      </div>
    </section>
  );
}
