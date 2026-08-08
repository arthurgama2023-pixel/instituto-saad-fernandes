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

/** Carrega o prontuário atual da consulta (para abrir o painel já preenchido). */
export async function GET(req: NextRequest) {
  const appointmentId = req.nextUrl.searchParams.get("appointmentId") ?? "";
  const doctorId = req.nextUrl.searchParams.get("doctorId") ?? "";
  if (!appointmentId || !doctorId) {
    return NextResponse.json({ error: "parâmetros ausentes" }, { status: 400 });
  }

  const appt = await db.appointment.findUnique({ where: { id: appointmentId }, include: { patient: true } });
  if (!appt || appt.doctorId !== doctorId) {
    return NextResponse.json({ error: "Consulta não encontrada para este médico." }, { status: 404 });
  }

  return NextResponse.json({
    resumoClinico: appt.resumoClinico ?? "",
    condutas: appt.condutas ?? "",
    prontuarioEmAt: appt.prontuarioEmAt?.toISOString() ?? null,
    condicoesCronicas: appt.patient.condicoesCronicas ?? "",
    alergias: appt.patient.alergias ?? "",
  });
}

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
