import { db } from "@/lib/db";

const HOLD_TTL_MS = 15 * 60 * 1000; // reserva de 15 min (Etapa 3 §2.3)
const OCCUPYING = ["CONFIRMADA", "AGUARDANDO_PAGAMENTO"];

/** Marca como EXPIRADA qualquer reserva cujo TTL venceu (expiração lazy — sem worker no MVP). */
export async function expireStaleHolds(): Promise<void> {
  await db.appointment.updateMany({
    where: { status: "AGUARDANDO_PAGAMENTO", holdUntil: { lt: new Date() } },
    data: { status: "EXPIRADA", holdUntil: null },
  });
}

type SlottableDoctor = {
  id: string;
  durationMin: number;
  availability: { weekday: number; startMin: number; endMin: number }[];
};

/** Slots livres de um médico = regras de disponibilidade − consultas ocupadas. */
async function freeSlots(doctor: SlottableDoctor, limit: number, days: number): Promise<string[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86400000);
  const busy = await db.appointment.findMany({
    where: { doctorId: doctor.id, status: { in: OCCUPYING }, startsAt: { gte: now, lte: horizon } },
    select: { startsAt: true },
  });
  const busySet = new Set(busy.map((b) => b.startsAt.getTime()));

  const slots: string[] = [];
  const minLead = new Date(now.getTime() + 2 * 3600000); // antecedência mínima 2h (Etapa 3 §4.1)

  for (let d = 0; d < days && slots.length < limit; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const rules = doctor.availability.filter((r) => r.weekday === day.getDay());
    for (const rule of rules) {
      for (let m = rule.startMin; m + doctor.durationMin <= rule.endMin; m += doctor.durationMin) {
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m);
        if (start < minLead) continue;
        if (busySet.has(start.getTime())) continue;
        slots.push(start.toISOString());
        if (slots.length >= limit) break;
      }
      if (slots.length >= limit) break;
    }
  }
  return slots;
}

/** Slots livres = regras de disponibilidade − consultas ocupadas, próximos `days` dias. */
export async function getNextSlots(doctorId: string, limit = 3, days = 10): Promise<string[]> {
  await expireStaleHolds();
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { availability: true },
  });
  if (!doctor) return [];
  return freeSlots(doctor, limit, days);
}

export type SpecialtyAvailability = {
  especialidade: { slug: string; name: string };
  medicos: {
    id: string;
    nome: string;
    crm: string;
    bio: string;
    yearsExp: number;
    rating: number;
    priceCents: number;
    durationMin: number;
    mode: string;
  }[];
  /** Dias com pelo menos um horário livre, em ordem crescente. */
  dias: {
    data: string; // YYYY-MM-DD
    horarios: { iso: string; hora: string; medicoIds: string[] }[];
  }[];
};

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Agenda da especialidade inteira: para cada dia, os horários com vaga e quais
 * médicos atendem em cada um. É o que sustenta o fluxo "escolho quando posso,
 * depois vejo quem me atende" — o inverso do fluxo guiado pela Clara.
 */
export async function availabilityBySpecialty(
  slug: string,
  days = 14,
): Promise<SpecialtyAvailability | null> {
  await expireStaleHolds();
  const specialty = await db.specialty.findUnique({ where: { slug } });
  if (!specialty) return null;

  const doctors = await db.doctor.findMany({
    where: { status: "ACTIVE", specialtyId: specialty.id },
    include: { user: true, availability: true },
    orderBy: { rating: "desc" },
  });

  // Uma agenda de 14 dias por médico cabe folgado; o teto evita explodir a
  // resposta se algum dia alguém cadastrar disponibilidade 24/7.
  const byIso = new Map<string, string[]>();
  for (const doctor of doctors) {
    for (const iso of await freeSlots(doctor, 500, days)) {
      const list = byIso.get(iso);
      if (list) list.push(doctor.id);
      else byIso.set(iso, [doctor.id]);
    }
  }

  const byDate = new Map<string, { iso: string; hora: string; medicoIds: string[] }[]>();
  for (const [iso, medicoIds] of byIso) {
    const when = new Date(iso);
    const date = isoDate(when);
    const list = byDate.get(date) ?? [];
    list.push({ iso, hora: isoTime(when), medicoIds });
    byDate.set(date, list);
  }

  const dias = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, horarios]) => ({
      data,
      horarios: horarios.sort((a, b) => a.iso.localeCompare(b.iso)),
    }));

  return {
    especialidade: { slug: specialty.slug, name: specialty.name },
    medicos: doctors.map((d) => ({
      id: d.id,
      nome: d.user.name,
      crm: d.crm,
      bio: d.bio,
      yearsExp: d.yearsExp,
      rating: d.rating,
      priceCents: d.priceCents,
      durationMin: d.durationMin,
      mode: d.mode,
    })),
    dias,
  };
}

export type HoldResult =
  | { ok: true; appointmentId: string; holdUntil: string; priceCents: number }
  | { ok: false; error: "slot_taken" | "doctor_not_found" };

/**
 * Reserva um slot com TTL de 15 min.
 * MVP/SQLite: exclusividade por transação (better-sqlite3 é single-writer).
 * Prod/Postgres: reforçada por índice UNIQUE parcial via migration.
 */
export async function holdSlot(patientId: string, doctorId: string, startsAtISO: string): Promise<HoldResult> {
  await expireStaleHolds();
  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return { ok: false, error: "doctor_not_found" };

  const startsAt = new Date(startsAtISO);

  return db.$transaction(async (tx) => {
    const clash = await tx.appointment.findFirst({
      where: { doctorId, startsAt, status: { in: OCCUPYING } },
    });
    if (clash) return { ok: false as const, error: "slot_taken" as const };

    // Uma reserva pendente por paciente: a anterior expira ao criar nova
    await tx.appointment.updateMany({
      where: { patientId, status: "AGUARDANDO_PAGAMENTO" },
      data: { status: "EXPIRADA", holdUntil: null },
    });

    const holdUntil = new Date(Date.now() + HOLD_TTL_MS);
    const appt = await tx.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt,
        durationMin: doctor.durationMin,
        mode: doctor.mode,
        status: "AGUARDANDO_PAGAMENTO",
        priceCents: doctor.priceCents,
        holdUntil,
      },
    });
    return {
      ok: true as const,
      appointmentId: appt.id,
      holdUntil: holdUntil.toISOString(),
      priceCents: doctor.priceCents,
    };
  });
}

export async function confirmAppointment(appointmentId: string): Promise<boolean> {
  const res = await db.appointment.updateMany({
    where: { id: appointmentId, status: "AGUARDANDO_PAGAMENTO" },
    data: { status: "CONFIRMADA", holdUntil: null },
  });
  return res.count > 0;
}

export async function cancelAppointment(appointmentId: string, patientId: string) {
  const appt = await db.appointment.findFirst({
    where: { id: appointmentId, patientId, status: { in: OCCUPYING } },
    include: { payment: true },
  });
  if (!appt) return { ok: false as const };
  await db.appointment.update({ where: { id: appt.id }, data: { status: "CANCELADA", holdUntil: null } });
  let refunded = false;
  if (appt.payment?.status === "CONFIRMED") {
    await db.payment.update({ where: { id: appt.payment.id }, data: { status: "REFUNDED" } });
    refunded = true;
  }
  return { ok: true as const, refunded, appt };
}

export async function myAppointments(patientId: string) {
  await expireStaleHolds();
  return db.appointment.findMany({
    where: { patientId, status: { in: ["CONFIRMADA", "AGUARDANDO_PAGAMENTO", "CONCLUIDA"] } },
    include: { doctor: { include: { user: true, specialty: true } }, payment: true },
    orderBy: { startsAt: "asc" },
  });
}

export async function getAppointment(appointmentId: string) {
  return db.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: { include: { user: true, specialty: true } }, payment: true },
  });
}
