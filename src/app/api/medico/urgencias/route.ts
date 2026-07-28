import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/modules/catalog/seed";
import { openRequestsForDoctor } from "@/modules/urgency/service";

/** Fila de chamados abertos da especialidade do médico — o painel faz polling. */
export async function GET(req: NextRequest) {
  await ensureSeeded();

  const medicoId = req.nextUrl.searchParams.get("medicoId");
  if (!medicoId) return NextResponse.json({ error: "medicoId obrigatório" }, { status: 400 });

  const chamados = await openRequestsForDoctor(medicoId);

  return NextResponse.json({
    chamados: chamados.map((c) => ({
      id: c.id,
      paciente: c.patient.name,
      especialidade: c.specialty.name,
      descricao: c.description,
      criadoEm: c.createdAt.toISOString(),
      expiraEm: c.expiresAt.toISOString(),
    })),
  });
}
