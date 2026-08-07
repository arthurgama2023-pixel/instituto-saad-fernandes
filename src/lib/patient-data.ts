"use client";

import { useCallback, useEffect, useState } from "react";

export type Appt = {
  id: string;
  medico: string;
  medicoCrm: string;
  medicoBio: string;
  especialidade: string;
  especialidadeSlug: string;
  icon: string;
  startsAt: string;
  durationMin: number;
  status: string;
  mode: string;
  priceCents: number;
  resumoClinico: string | null;
  condutas: string | null;
  receituarioEspecial: boolean;
  assinaturaIcpStatus: string | null;
  assinaturaIcpEm: string | null;
  assinaturaIcpTitular: string | null;
};

export type Specialty = { slug: string; name: string; icon: string };

export type PatientData = {
  name: string;
  phone: string | null;
  next: Appt | null;
  upcoming: Appt[];
  past: Appt[];
  specialties: Specialty[];
  healthSummary: string;
};

export function usePatient() {
  const [data, setData] = useState<PatientData | null>(null);
  const [error, setError] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, reload: load };
}

// A especialidade guarda um emoji (usado pelos painéis médico/admin); a identidade
// Smart Doctor usa Material Symbols, então o mapa traduz slug → ícone.
const SPECIALTY_ICONS: Record<string, string> = {
  tricologia: "content_cut",
  dermatologia: "biotech",
  "clinica-geral": "stethoscope",
};

export const specialtyIcon = (slug: string) => SPECIALTY_ICONS[slug] ?? "medical_services";

export const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dayNum = (iso: string) => new Date(iso).getDate().toString().padStart(2, "0");

export const monthShort = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const weekdayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "long" });

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
