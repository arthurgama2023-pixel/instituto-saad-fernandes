import { db } from "@/lib/db";
import { confirmAppointment } from "@/modules/scheduling/service";

const TAKE_RATE_BPS = 1500; // 15% (Etapa 8)

/** Gera cobrança PIX (mock no MVP — em produção: Pagar.me/Mercado Pago + webhook). */
export async function createCharge(appointmentId: string) {
  const appt = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.status !== "AGUARDANDO_PAGAMENTO") return null;

  const existing = await db.payment.findUnique({ where: { appointmentId } });
  if (existing) return existing; // idempotente

  const pixCode = `00020126580014BR.GOV.BCB.PIX0136saadfernandes-${appointmentId.slice(-8)}5204000053039865802BR5915INST SAAD FERN6009SAO PAULO`;
  return db.payment.create({
    data: {
      appointmentId,
      amountCents: appt.priceCents,
      feeCents: Math.round((appt.priceCents * TAKE_RATE_BPS) / 10000),
      pixCode,
    },
  });
}

/** Simula o webhook do gateway confirmando o PIX (botão "Simular pagamento" no demo). */
export async function simulatePaymentConfirmed(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PENDING") return null;
  await db.payment.update({ where: { id: paymentId }, data: { status: "CONFIRMED" } });
  const ok = await confirmAppointment(payment.appointmentId);
  return ok ? payment : null;
}
