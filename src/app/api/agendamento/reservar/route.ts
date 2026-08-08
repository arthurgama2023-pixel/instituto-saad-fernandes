import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPatientUser } from "@/lib/session";
import { ensureSeeded } from "@/modules/catalog/seed";
import { holdSlot } from "@/modules/scheduling/service";
import { createCharge } from "@/modules/payments/service";
import { db } from "@/lib/db";

const Body = z.object({
  medicoId: z.string().min(1),
  iso: z.iso.datetime(),
});

/** Reserva o slot (TTL 15 min) e já gera a cobrança PIX do passo de pagamento. */
export async function POST(req: NextRequest) {
  await ensureSeeded();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const hold = await holdSlot(user.id, parsed.data.medicoId, parsed.data.iso);
  if (!hold.ok) {
    // slot_taken acontece de verdade: dois pacientes na mesma tela, mesmo horário.
    const status = hold.error === "slot_taken" ? 409 : 404;
    return NextResponse.json({ error: hold.error }, { status });
  }

  const payment = await createCharge(hold.appointmentId);
  if (!payment) return NextResponse.json({ error: "falha ao gerar cobrança" }, { status: 500 });

  const appt = await db.appointment.findUniqueOrThrow({
    where: { id: hold.appointmentId },
    include: { doctor: { include: { user: true, specialty: true } } },
  });

  return NextResponse.json({
    consultaId: appt.id,
    medico: appt.doctor.user.name,
    especialidade: appt.doctor.specialty.name,
    startsAt: appt.startsAt.toISOString(),
    durationMin: appt.durationMin,
    mode: appt.mode,
    holdUntil: hold.holdUntil,
    pagamento: {
      id: payment.id,
      pixCode: payment.pixCode,
      amountCents: payment.amountCents,
      status: payment.status,
    },
  });
}
