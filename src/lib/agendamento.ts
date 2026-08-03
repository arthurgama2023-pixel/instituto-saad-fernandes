"use client";

export type Medico = {
  id: string;
  nome: string;
  crm: string;
  bio: string;
  yearsExp: number;
  rating: number;
  priceCents: number;
  durationMin: number;
  mode: string;
};

export type Horario = { iso: string; hora: string; medicoIds: string[] };

export type Disponibilidade = {
  especialidade: { slug: string; name: string };
  medicos: Medico[];
  dias: { data: string; horarios: Horario[] }[];
};

export type Reserva = {
  consultaId: string;
  medico: string;
  especialidade: string;
  startsAt: string;
  durationMin: number;
  mode: string;
  holdUntil: string;
  pagamento: { id: string; pixCode: string; amountCents: number; status: string };
};

export type Confirmacao = {
  consultaId: string;
  status: string;
  medico: string;
  especialidade: string;
  startsAt: string;
  durationMin: number;
  mode: string;
};

/** "2026-07-31" → "qui, 31 jul" — sem passar por Date para não escorregar de fuso. */
export function rotuloDia(data: string): { diaSemana: string; dia: string; mes: string } {
  const [y, m, d] = data.split("-").map(Number);
  const when = new Date(y, m - 1, d);
  return {
    diaSemana: when.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    dia: String(d).padStart(2, "0"),
    mes: when.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
  };
}

/** "quarta-feira, 29 de julho" com a inicial maiúscula — `capitalize` do CSS
 *  estragaria o resto ("29 De Julho Às"). */
export function dataExtenso(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function contagemRegressiva(ateISO: string): string {
  const restante = Math.max(0, new Date(ateISO).getTime() - Date.now());
  const min = Math.floor(restante / 60000);
  const seg = Math.floor((restante % 60000) / 1000);
  return `${min}:${String(seg).padStart(2, "0")}`;
}
