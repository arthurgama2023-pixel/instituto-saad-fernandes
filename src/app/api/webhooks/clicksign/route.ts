import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Recebe a confirmação assíncrona do Clicksign quando o médico termina de
// assinar com o certificado ICP-Brasil dele. Não roda em localhost (o
// Clicksign precisa de uma URL pública) — fica pronto pra quando o app for
// implantado e o webhook for cadastrado (POST /api/v3/webhooks) apontando
// pra cá.
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const envelopeId: string | undefined = payload?.data?.attributes?.envelope?.id ?? payload?.envelope?.id;
  const event: string | undefined = payload?.event?.name ?? payload?.data?.attributes?.event?.name;

  if (!envelopeId || event !== "document_closed") {
    // Outros eventos (upload, add_image etc.) não nos interessam aqui.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const appt = await db.appointment.findFirst({ where: { assinaturaIcpEnvelopeId: envelopeId } });
  if (!appt) return NextResponse.json({ ok: true, ignored: true });

  await db.appointment.update({
    where: { id: appt.id },
    data: { assinaturaIcpStatus: "ASSINADO", assinaturaIcpEm: new Date() },
  });

  return NextResponse.json({ ok: true });
}
