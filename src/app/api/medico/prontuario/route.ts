import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

// Amostra/versão manual do prontuário: sem IA, sem certificação SBIS/CFM.
// O médico escreve texto livre; nada é obrigatório.
const Body = z.object({
  appointmentId: z.string().min(1),
  doctorId: z.string().min(1),
  resumoClinico: z.string().trim().max(4000).optional().default(""),
  condutas: z.string().trim().max(4000).optional().default(""),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os campos e tente de novo." }, { status: 400 });
  }
  const { appointmentId, doctorId, resumoClinico, condutas } = parsed.data;

  const appt = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.doctorId !== doctorId) {
    return NextResponse.json({ error: "Consulta não encontrada para este médico." }, { status: 404 });
  }

  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data: {
      resumoClinico: resumoClinico || null,
      condutas: condutas || null,
      prontuarioEmAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    resumoClinico: updated.resumoClinico,
    condutas: updated.condutas,
    prontuarioEmAt: updated.prontuarioEmAt?.toISOString() ?? null,
  });
}
