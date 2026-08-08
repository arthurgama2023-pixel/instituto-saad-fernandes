import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPatientUser } from "@/lib/session";
import { db } from "@/lib/db";

/** Doenças crônicas e alergias do paciente logado, visíveis ao médico. */
export async function GET() {
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  return NextResponse.json({
    condicoesCronicas: user.condicoesCronicas ?? "",
    alergias: user.alergias ?? "",
  });
}

const Body = z.object({
  condicoesCronicas: z.string().trim().max(2000).optional().default(""),
  alergias: z.string().trim().max(2000).optional().default(""),
});

export async function PUT(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os campos e tente de novo." }, { status: 400 });

  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      condicoesCronicas: parsed.data.condicoesCronicas || null,
      alergias: parsed.data.alergias || null,
    },
  });

  return NextResponse.json({
    ok: true,
    condicoesCronicas: updated.condicoesCronicas ?? "",
    alergias: updated.alergias ?? "",
  });
}
