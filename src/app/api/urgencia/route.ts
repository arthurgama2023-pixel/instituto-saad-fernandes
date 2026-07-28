import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser } from "@/lib/session";
import { ensureSeeded } from "@/modules/catalog/seed";
import { listSpecialties } from "@/modules/catalog/service";
import { currentRequest, openRequest, serializeRequest } from "@/modules/urgency/service";

const Body = z.object({
  especialidade: z.string().min(1),
  descricao: z.string().trim().max(500),
});

/** Estado do chamado corrente do paciente — a tela faz polling nisto. */
export async function GET() {
  await ensureSeeded();
  const user = await getDemoUser();
  const [chamado, specialties] = await Promise.all([currentRequest(user.id), listSpecialties()]);

  return NextResponse.json({
    especialidades: specialties.map((s) => ({ slug: s.slug, name: s.name, icon: s.icon })),
    chamado: serializeRequest(chamado),
  });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const user = await getDemoUser();
  const created = await openRequest(user.id, parsed.data.especialidade, parsed.data.descricao);
  if (!created) return NextResponse.json({ error: "especialidade não encontrada" }, { status: 404 });

  return NextResponse.json({ chamado: serializeRequest(await currentRequest(user.id)) });
}
