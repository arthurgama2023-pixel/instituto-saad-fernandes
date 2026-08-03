import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/modules/catalog/seed";

/** Especialidades para o select do formulário. */
export async function GET() {
  await ensureSeeded();
  const especialidades = await db.specialty.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ especialidades: especialidades.map((s) => ({ slug: s.slug, name: s.name })) });
}

const Body = z.object({
  nome: z.string().trim().min(3).max(120),
  whatsapp: z.string().trim().min(8).max(20),
  crmNumero: z.string().trim().min(3).max(20),
  uf: z.string().trim().length(2),
  especialidadeSlug: z.string().min(1),
  anosExperiencia: z.number().int().min(0).max(70),
  precoReais: z.number().min(0).max(100000),
  modalidade: z.enum(["VIDEO", "IN_PERSON", "BOTH"]),
  bio: z.string().trim().min(20).max(600),
});

/**
 * Cadastro público de médico. Cria o registro como PENDING — só entra em ACTIVE
 * depois da verificação/aprovação no painel admin. Nenhum médico atende antes disso.
 */
export async function POST(req: NextRequest) {
  await ensureSeeded();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os campos e tente de novo.", detalhes: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const specialty = await db.specialty.findUnique({ where: { slug: d.especialidadeSlug } });
  if (!specialty) return NextResponse.json({ error: "Especialidade inválida." }, { status: 400 });

  const crm = `CRM ${d.crmNumero}-${d.uf.toUpperCase()}`;

  const user = await db.user.create({
    data: { name: d.nome.trim(), phone: d.whatsapp.replace(/\D/g, "") || null, role: "DOCTOR" },
  });
  await db.doctor.create({
    data: {
      userId: user.id,
      crm,
      bio: d.bio.trim(),
      yearsExp: d.anosExperiencia,
      priceCents: Math.round(d.precoReais * 100),
      mode: d.modalidade,
      status: "PENDING",
      specialtyId: specialty.id,
    },
  });

  return NextResponse.json({ ok: true, nome: d.nome.trim(), especialidade: specialty.name });
}
