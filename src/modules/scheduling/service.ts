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

/** Slots livres = regras de disponibilidade − consultas ocupadas, próximos `days` dias. */
export async function getNextSlots(doctorId: string, limit = 3, days = 10): Promise<string[]> {
  await expireStaleHolds();
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { availability: true },
  });
  if (!doctor) return [];

  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86400000);
  const busy = await db.appointment.findMany({
    where: { doctorId, status: { in: OCCUPYING }, startsAt: { gte: now, lte: horizon } },
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
