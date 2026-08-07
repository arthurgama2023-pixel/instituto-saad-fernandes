import { db } from "@/lib/db";

// Janela de acesso à sala: mesma regra que já existia no client (CallCard.tsx)
// — de 10 min antes até o fim da consulta. Reforçada aqui no servidor.
const JOIN_ANTES_MS = 10 * 60 * 1000;

type Appt = { id: string; startsAt: Date; durationMin: number };

/** Consulta está dentro da janela de acesso (10 min antes até o fim)? */
export function dentroDaJanela(appt: Pick<Appt, "startsAt" | "durationMin">, now = new Date()): boolean {
  const startMs = appt.startsAt.getTime();
  const endMs = startMs + appt.durationMin * 60000;
  const nowMs = now.getTime();
  return nowMs >= startMs - JOIN_ANTES_MS && nowMs <= endMs;
}

export type RoomAccessError = "not_found" | "outside_window";

/**
 * Valida a consulta e devolve o nome da sala Jitsi. O nome é determinístico a
 * partir do id da consulta (um cuid, não adivinhável) — o Jitsi público
 * (meet.jit.si) não exige criar sala nem token antes; basta um nome único.
 */
export async function getRoomAccess(
  appointmentId: string,
): Promise<{ ok: true; data: { roomName: string } } | { ok: false; error: RoomAccessError }> {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, startsAt: true, durationMin: true },
  });
  if (!appt) return { ok: false, error: "not_found" };
  if (!dentroDaJanela(appt)) return { ok: false, error: "outside_window" };
  return { ok: true, data: { roomName: `smartdoctor-${appt.id}` } };
}
