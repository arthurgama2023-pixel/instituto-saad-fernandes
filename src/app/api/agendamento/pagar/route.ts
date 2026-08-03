import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { simulatePaymentConfirmed } from "@/modules/payments/service";
import { db } from "@/lib/db";

const Body = z.object({ pagamentoId: z.string().min(1) });

/**
 * Simula o webhook do gateway confirmando o PIX (botão do demo).
 * Diferente de /api/payments/simulate, esta rota não mexe na conversa da Clara —
 * o agendamento por telas não passa pelo chat.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const payment = await simulatePaymentConfirmed(parsed.data.pagamentoId);
  if (!payment) return NextResponse.json({ error: "pagamento não confirmado" }, { status: 409 });

  const appt = await db.appointment.findUniqueOrThrow({
    where: { id: payment.appointmentId },
    include: { doctor: { include: { user: true, specialty: true } } },
  });

  return NextResponse.json({
    consultaId: appt.id,
    status: appt.status,
    medico: appt.doctor.user.name,
    especialidade: appt.doctor.specialty.name,
    startsAt: appt.startsAt.toISOString(),
    durationMin: appt.durationMin,
    mode: appt.mode,
  });
}
