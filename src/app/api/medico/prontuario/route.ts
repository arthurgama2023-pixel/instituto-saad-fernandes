import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { assinarMock } from "@/lib/assinatura-icp";

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
    include: { doctor: { include: { user: true } } },
  });
  if (!appt || appt.doctorId !== doctorId) {
    return NextResponse.json({ error: "Consulta não encontrada para este médico." }, { status: 404 });
  }

  // Documento já assinado (ICP-Brasil) é imutável — igual a um documento
  // assinado de verdade, não dá pra editar depois.
  if (appt.assinaturaIcpEm) {
    return NextResponse.json({ error: "Este registro já foi assinado digitalmente e não pode ser alterado." }, { status: 409 });
  }

  const assinatura = receituarioEspecial ? assinarMock(appt.doctor.user.name) : null;

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
    assinaturaIcpEm: updated.assinaturaIcpEm?.toISOString() ?? null,
    assinaturaIcpTitular: updated.assinaturaIcpTitular,
    assinaturaIcpSerial: updated.assinaturaIcpSerial,
  });
}
