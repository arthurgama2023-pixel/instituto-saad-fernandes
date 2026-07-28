import { db } from "@/lib/db";
import { createCharge } from "@/modules/payments/service";

const BUSCA_TTL_MS = 10 * 60 * 1000; // o chamado fica no ar 10 min procurando médico
const HOLD_TTL_MS = 15 * 60 * 1000; // mesmo TTL do agendamento normal
const LEAD_MIN = 10; // urgência começa "já": 10 min depois do aceite

/** Fecha chamados que ninguém aceitou dentro do TTL (expiração lazy, sem worker). */
export async function expireStaleRequests(): Promise<void> {
  await db.urgencyRequest.updateMany({
    where: { status: "BUSCANDO", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRADA" },
  });
}

export async function openRequest(patientId: string, specialtySlug: string, description: string) {
  await expireStaleRequests();
  const specialty = await db.specialty.findUnique({ where: { slug: specialtySlug } });
  if (!specialty) return null;

  // Um chamado por vez: abrir outro cancela o anterior que ainda procurava.
  await db.urgencyRequest.updateMany({
    where: { patientId, status: "BUSCANDO" },
    data: { status: "CANCELADA" },
  });

  return db.urgencyRequest.create({
    data: {
      patientId,
      specialtyId: specialty.id,
      description,
      expiresAt: new Date(Date.now() + BUSCA_TTL_MS),
    },
  });
}

export async function cancelRequest(id: string, patientId: string): Promise<boolean> {
  const res = await db.urgencyRequest.updateMany({
    where: { id, patientId, status: "BUSCANDO" },
    data: { status: "CANCELADA" },
  });
  return res.count > 0;
}

/** Chamado corrente do paciente: o que ainda está vivo (procurando, aceito ou pago). */
export async function currentRequest(patientId: string) {
  await expireStaleRequests();
  return db.urgencyRequest.findFirst({
    where: { patientId, status: { in: ["BUSCANDO", "ACEITA", "PAGA"] } },
    include: {
      specialty: true,
      doctor: { include: { user: true } },
      appointment: { include: { payment: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Fila do médico: chamados abertos da especialidade dele. */
export async function openRequestsForDoctor(doctorId: string) {
  await expireStaleRequests();
  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor || doctor.status !== "ACTIVE") return [];

  return db.urgencyRequest.findMany({
    where: { status: "BUSCANDO", specialtyId: doctor.specialtyId },
    include: { patient: true, specialty: true },
    orderBy: { createdAt: "asc" },
  });
}

export type AcceptResult =
  | { ok: true; requestId: string; appointmentId: string }
  | { ok: false; error: "ja_aceita" | "medico_invalido" };

/**
 * Aceite do chamado. A corrida entre médicos é resolvida pelo updateMany
 * condicionado a status BUSCANDO: quem atualiza 1 linha ganhou, os outros veem 0.
 */
export async function acceptRequest(requestId: string, doctorId: string): Promise<AcceptResult> {
  await expireStaleRequests();

  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor || doctor.status !== "ACTIVE") return { ok: false, error: "medico_invalido" };

  const request = await db.urgencyRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "BUSCANDO" || request.specialtyId !== doctor.specialtyId) {
    return { ok: false, error: "ja_aceita" };
  }

  const claimed = await db.urgencyRequest.updateMany({
    where: { id: requestId, status: "BUSCANDO" },
    data: { status: "ACEITA", doctorId, acceptedAt: new Date() },
  });
  if (claimed.count === 0) return { ok: false, error: "ja_aceita" };

  const startsAt = new Date(Date.now() + LEAD_MIN * 60000);
  const appointment = await db.appointment.create({
    data: {
      patientId: request.patientId,
      doctorId,
      startsAt,
      durationMin: doctor.durationMin,
      mode: request.mode,
      status: "AGUARDANDO_PAGAMENTO",
      priceCents: doctor.priceCents,
      holdUntil: new Date(Date.now() + HOLD_TTL_MS),
    },
  });
  await db.urgencyRequest.update({
    where: { id: requestId },
    data: { appointmentId: appointment.id },
  });
  await createCharge(appointment.id);

  return { ok: true, requestId, appointmentId: appointment.id };
}

type ChamadoCompleto = Awaited<ReturnType<typeof currentRequest>>;

/** Formato que as telas do paciente consomem. */
export function serializeRequest(chamado: ChamadoCompleto) {
  if (!chamado) return null;
  return {
    id: chamado.id,
    status: chamado.status,
    descricao: chamado.description,
    especialidade: chamado.specialty.name,
    especialidadeSlug: chamado.specialty.slug,
    criadoEm: chamado.createdAt.toISOString(),
    expiraEm: chamado.expiresAt.toISOString(),
    medico: chamado.doctor
      ? {
          nome: chamado.doctor.user.name,
          crm: chamado.doctor.crm,
          bio: chamado.doctor.bio,
          rating: chamado.doctor.rating,
          yearsExp: chamado.doctor.yearsExp,
        }
      : null,
    consulta: chamado.appointment
      ? {
          id: chamado.appointment.id,
          startsAt: chamado.appointment.startsAt.toISOString(),
          durationMin: chamado.appointment.durationMin,
          mode: chamado.appointment.mode,
          status: chamado.appointment.status,
          holdUntil: chamado.appointment.holdUntil?.toISOString() ?? null,
        }
      : null,
    pagamento: chamado.appointment?.payment
      ? {
          id: chamado.appointment.payment.id,
          pixCode: chamado.appointment.payment.pixCode,
          amountCents: chamado.appointment.payment.amountCents,
          status: chamado.appointment.payment.status,
        }
      : null,
  };
}

/** Marca o chamado como pago depois que a cobrança foi confirmada. */
export async function markRequestPaid(appointmentId: string): Promise<void> {
  await db.urgencyRequest.updateMany({
    where: { appointmentId, status: "ACEITA" },
    data: { status: "PAGA" },
  });
}
