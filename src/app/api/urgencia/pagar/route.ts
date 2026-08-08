import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPatientUser } from "@/lib/session";
import { simulatePaymentConfirmed } from "@/modules/payments/service";
import { currentRequest, markRequestPaid, serializeRequest } from "@/modules/urgency/service";

const Body = z.object({ pagamentoId: z.string().min(1) });

/** Confirma o PIX do chamado (mock do webhook) e fecha o chamado como PAGA. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const payment = await simulatePaymentConfirmed(parsed.data.pagamentoId);
  if (!payment) return NextResponse.json({ error: "pagamento não confirmado" }, { status: 409 });

  await markRequestPaid(payment.appointmentId);

  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  return NextResponse.json({ chamado: serializeRequest(await currentRequest(user.id)) });
}
