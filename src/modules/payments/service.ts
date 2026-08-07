import { db } from "@/lib/db";
import { confirmAppointment } from "@/modules/scheduling/service";
import { notifyAppointment } from "@/modules/notifications/appointments";

const TAKE_RATE_BPS = 1500; // 15% (Etapa 8)

/** Gera cobrança PIX (mock no MVP — em produção: Pagar.me/Mercado Pago + webhook). */
export async function createCharge(appointmentId: string) {
  const appt = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.status !== "AGUARDANDO_PAGAMENTO") return null;

  const existing = await db.payment.findUnique({ where: { appointmentId } });
  if (existing) return existing; // idempotente

  // Payload EMV de mentira, só para o app ter o que exibir/copiar. Os prefixos de
  // tamanho (2642, 0120, 5912) batem com o conteúdo para não parecer lixo se alguém
  // colar num leitor — mas não tem CRC16 válido no fim, então não é cobrável.
  const pixCode = `00020126420014BR.GOV.BCB.PIX0120smartdoctor-${appointmentId.slice(-8)}5204000053039865802BR5912SMART DOCTOR6009SAO PAULO`;
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
  if (ok) await notifyAppointment(payment.appointmentId, "confirmacao");
  return ok ? payment : null;
}
