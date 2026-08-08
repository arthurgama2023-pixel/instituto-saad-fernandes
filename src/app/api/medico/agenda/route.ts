import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthedDoctorId } from "@/lib/doctor-session";

const NAO_AUTENTICADO = { error: "Entre como médico para editar sua agenda.", naoAutenticado: true };

/** Disponibilidade (regras semanais) do MÉDICO AUTENTICADO. */
export async function GET() {
  const doctorId = await getAuthedDoctorId();
  if (!doctorId) return NextResponse.json(NAO_AUTENTICADO, { status: 401 });

  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { availability: true },
  });
  if (!doctor) return NextResponse.json({ error: "Médico não encontrado." }, { status: 404 });

  return NextResponse.json({
    durationMin: doctor.durationMin,
    regras: doctor.availability
      .map((r) => ({ weekday: r.weekday, startMin: r.startMin, endMin: r.endMin }))
      .sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin),
  });
}

const Regra = z.object({
  weekday: z.number().int().min(0).max(6),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
});
const Body = z.object({ regras: z.array(Regra).max(60) });

export async function PUT(req: NextRequest) {
  const doctorId = await getAuthedDoctorId();
  if (!doctorId) return NextResponse.json(NAO_AUTENTICADO, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os horários e tente de novo." }, { status: 400 });

  // Cada faixa precisa ter fim depois do início.
  const invalida = parsed.data.regras.find((r) => r.endMin <= r.startMin);
  if (invalida) {
    return NextResponse.json({ error: "O horário final precisa ser depois do inicial." }, { status: 400 });
  }

  // Sobreposição no mesmo dia gera slots duplicados — barra antes de gravar.
  const porDia = new Map<number, { startMin: number; endMin: number }[]>();
  for (const r of parsed.data.regras) {
    const lista = porDia.get(r.weekday) ?? [];
    if (lista.some((x) => r.startMin < x.endMin && x.startMin < r.endMin)) {
      return NextResponse.json({ error: "Há faixas de horário sobrepostas no mesmo dia." }, { status: 400 });
    }
    lista.push({ startMin: r.startMin, endMin: r.endMin });
    porDia.set(r.weekday, lista);
  }

  const doctor = await db.doctor.findUnique({ where: { id: doctorId }, select: { id: true } });
  if (!doctor) return NextResponse.json({ error: "Médico não encontrado." }, { status: 404 });

  // Substitui todas as regras do médico numa transação (deleta + recria).
  await db.$transaction([
    db.availabilityRule.deleteMany({ where: { doctorId } }),
    db.availabilityRule.createMany({
      data: parsed.data.regras.map((r) => ({ doctorId, weekday: r.weekday, startMin: r.startMin, endMin: r.endMin })),
    }),
  ]);

  return NextResponse.json({ ok: true, total: parsed.data.regras.length });
}
