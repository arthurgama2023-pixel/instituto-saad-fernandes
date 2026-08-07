import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { criarEnvelope, enviarDocumento, criarSignatario, exigirAssinaturaIcp, ativarEnvelope } from "@/lib/clicksign";
import { gerarReceituarioPdf, paraBase64 } from "@/lib/receituario-pdf";

// Amostra/versão manual do prontuário: sem IA, sem certificação SBIS/CFM.
// O médico escreve texto livre; nada é obrigatório.
const Body = z.object({
  appointmentId: z.string().min(1),
  doctorId: z.string().min(1),
  resumoClinico: z.string().trim().max(4000).optional().default(""),
  condutas: z.string().trim().max(4000).optional().default(""),
  receituarioEspecial: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os campos e tente de novo." }, { status: 400 });
  }
  const { appointmentId, doctorId, resumoClinico, condutas, receituarioEspecial } = parsed.data;

  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: { include: { user: true } }, patient: true },
  });
  if (!appt || appt.doctorId !== doctorId) {
    return NextResponse.json({ error: "Consulta não encontrada para este médico." }, { status: 404 });
  }

  // Enviado pro Clicksign (mesmo que ainda não assinado) é imutável — igual a
  // um documento assinado de verdade, não dá pra editar depois de mandado.
  if (appt.assinaturaIcpStatus) {
    return NextResponse.json({ error: "Este registro já foi enviado para assinatura e não pode ser alterado." }, { status: 409 });
  }

  if (receituarioEspecial && !condutas.trim()) {
    return NextResponse.json({ error: "Escreva a prescrição em Condutas antes de assinar." }, { status: 400 });
  }

  let assinatura: {
    receituarioEspecial: true;
    assinaturaIcpStatus: "AGUARDANDO_ASSINATURA";
    assinaturaIcpEnvelopeId: string;
    assinaturaIcpDocumentId: string;
    assinaturaIcpSignerId: string;
    assinaturaIcpTitular: string;
  } | null = null;

  if (receituarioEspecial) {
    if (!appt.doctor.user.phone) {
      return NextResponse.json({ error: "Médico sem telefone cadastrado — o Clicksign precisa dele para notificar a assinatura." }, { status: 422 });
    }
    if (!appt.doctor.cpf) {
      return NextResponse.json({ error: "Médico sem CPF cadastrado — o Clicksign exige o CPF pra validar o certificado ICP-Brasil." }, { status: 422 });
    }
    try {
      const pdf = await gerarReceituarioPdf({
        paciente: appt.patient.name,
        medico: appt.doctor.user.name,
        medicoCrm: appt.doctor.crm,
        conteudo: condutas,
        data: new Date(),
      });

      const envelopeId = await criarEnvelope(`Receituário especial — ${appt.patient.name} — ${new Date().toLocaleDateString("pt-BR")}`);
      const documentId = await enviarDocumento(envelopeId, "receituario-especial.pdf", paraBase64(pdf));
      const signerId = await criarSignatario(envelopeId, {
        nome: appt.doctor.user.name,
        telefoneE164: appt.doctor.user.phone,
        cpf: appt.doctor.cpf,
      });
      await exigirAssinaturaIcp(envelopeId, documentId, signerId);
      await ativarEnvelope(envelopeId);

      assinatura = {
        receituarioEspecial: true,
        assinaturaIcpStatus: "AGUARDANDO_ASSINATURA",
        assinaturaIcpEnvelopeId: envelopeId,
        assinaturaIcpDocumentId: documentId,
        assinaturaIcpSignerId: signerId,
        assinaturaIcpTitular: appt.doctor.user.name,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      return NextResponse.json({ error: `Não consegui enviar para assinatura no Clicksign: ${msg}` }, { status: 502 });
    }
  }

  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data: {
      resumoClinico: resumoClinico || null,
      condutas: condutas || null,
      prontuarioEmAt: new Date(),
      receituarioEspecial,
      ...(assinatura ?? {}),
    },
  });

  return NextResponse.json({
    ok: true,
    resumoClinico: updated.resumoClinico,
    condutas: updated.condutas,
    prontuarioEmAt: updated.prontuarioEmAt?.toISOString() ?? null,
    receituarioEspecial: updated.receituarioEspecial,
    assinaturaIcpStatus: updated.assinaturaIcpStatus,
    assinaturaIcpEnvelopeId: updated.assinaturaIcpEnvelopeId,
    assinaturaIcpEm: updated.assinaturaIcpEm?.toISOString() ?? null,
    assinaturaIcpTitular: updated.assinaturaIcpTitular,
  });
}
