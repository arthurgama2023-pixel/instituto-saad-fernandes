import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getRoomAccess } from "@/modules/video/service";

const Body = z.object({
  como: z.enum(["medico", "paciente"]),
  doctorId: z.string().optional(),
});

/** Valida a janela de horário no servidor e devolve o nome da sala Jitsi + nome de exibição. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const isDoctor = parsed.data.como === "medico";
  let userName = "Participante";
  if (isDoctor) {
    if (!parsed.data.doctorId) return NextResponse.json({ error: "doctorId obrigatório" }, { status: 400 });
    const doctor = await db.doctor.findUnique({ where: { id: parsed.data.doctorId }, include: { user: true } });
    if (!doctor) return NextResponse.json({ error: "médico não encontrado" }, { status: 404 });
    userName = doctor.user.name;
  } else {
    const user = await getDemoUser();
    userName = user.name;
  }

  const result = await getRoomAccess(id);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ roomName: result.data.roomName, userName });
}
