import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUser } from "@/lib/session";
import { buscarArquivoAssinado } from "@/lib/clicksign";

// Não guarda o link de download — ele expira em ~5min (é uma URL pré-assinada
// da AWS). Busca fresco no Clicksign a cada clique e redireciona pra lá.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const user = await getDemoUser();

  const appt = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.patientId !== user.id) {
    return NextResponse.json({ error: "Consulta não encontrada." }, { status: 404 });
  }
  if (appt.assinaturaIcpStatus !== "ASSINADO" || !appt.assinaturaIcpEnvelopeId || !appt.assinaturaIcpDocumentId) {
    return NextResponse.json({ error: "Este receituário ainda não foi assinado." }, { status: 409 });
  }

  try {
    const url = await buscarArquivoAssinado(appt.assinaturaIcpEnvelopeId, appt.assinaturaIcpDocumentId);
    if (!url) return NextResponse.json({ error: "Documento assinado ainda não disponível para download." }, { status: 404 });
    return NextResponse.redirect(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: `Não consegui buscar o documento: ${msg}` }, { status: 502 });
  }
}
