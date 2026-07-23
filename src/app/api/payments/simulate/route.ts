import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";
import { simulatePaymentConfirmed } from "@/modules/payments/service";
import { appointmentSummary } from "@/modules/ai/tools";
import { addMessage, getOrCreateConversation, listMessages, setState } from "@/modules/conversation/service";
import { fmtSlot } from "@/modules/shared/format";
import { db } from "@/lib/db";

// Simula o webhook do gateway (demo). Em produção: POST /v1/webhooks/payments
// com verificação de assinatura + idempotência (Etapa 6 §5.2).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  if (!paymentId) return NextResponse.json({ error: "missing paymentId" }, { status: 400 });

  const user = await getDemoUser();
  const conv = await getOrCreateConversation(user.id);

  const payment = await simulatePaymentConfirmed(paymentId);
  if (payment) {
    const appt = await db.appointment.findUnique({ where: { id: payment.appointmentId } });
    const summary = appt ? await appointmentSummary(appt.id) : null;
    const text = summary
      ? `Pagamento confirmado ✓ Consulta marcada! 🎉\n\n📅 *${summary.medico}* (${summary.especialidade})\n🗓 ${summary.quando} · 📹 por vídeo\n\nO link da sala chega aqui *15 minutos antes*. Te lembro na véspera também 💙`
      : "Pagamento confirmado ✓ Consulta marcada! 🎉";
    await addMessage(conv.id, "clara", text, {
      uiEvents: summary ? [{ type: "appointment", appt: summary }] : [],
      quickReplies: ["Minhas consultas", "Marcar outra consulta"],
    });
    await setState(conv.id, {});
  }

  const messages = await listMessages(conv.id);
  return NextResponse.json({
    ok: Boolean(payment),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      payload: m.payload ? JSON.parse(m.payload) : null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
