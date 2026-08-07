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

// Amostra: nenhum campo é obrigatório (pedido do dono). Só limites máximos
// (sanidade do banco) — sem mínimos, sem regra de formato. Tudo aceita vazio.
const Body = z.object({
  nome: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  whatsapp: z.string().trim().max(20).optional().default(""),
  crmNumero: z.string().trim().max(20).optional().default(""),
  uf: z.string().trim().max(2).optional().default(""),
  especialidadeSlug: z.string().optional().default(""),
  anosExperiencia: z.number().int().min(0).max(70).optional().default(0),
  precoReais: z.number().min(0).max(100000).optional().default(0),
  modalidade: z.enum(["VIDEO", "IN_PERSON", "BOTH"]).optional().default("VIDEO"),
  bio: z.string().trim().max(600).optional().default(""),
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

  // Especialidade vazia ou inválida: cai na primeira disponível, pra não
  // travar um cadastro de amostra por falta de seleção.
  const specialty =
    (d.especialidadeSlug && (await db.specialty.findUnique({ where: { slug: d.especialidadeSlug } }))) ||
    (await db.specialty.findFirst({ orderBy: { name: "asc" } }));
  if (!specialty) return NextResponse.json({ error: "Nenhuma especialidade cadastrada." }, { status: 500 });

  const nome = d.nome.trim() || "Médico(a) sem nome informado";
  const crmNumero = d.crmNumero.trim() || "—";
  const uf = (d.uf.trim() || "—").toUpperCase();
  const crm = `CRM ${crmNumero}-${uf}`;

  // E-mail é onde chegam as notificações de consulta. Guardamos só se preenchido
  // e ainda livre (é @unique) — vazio/duplicado vira null pra não travar o cadastro.
  const emailNorm = d.email.trim().toLowerCase() || null;
  const emailLivre = emailNorm && !(await db.user.findUnique({ where: { email: emailNorm } })) ? emailNorm : null;

  const user = await db.user.create({
    data: {
      name: nome,
      email: emailLivre,
      phone: d.whatsapp.replace(/\D/g, "") || null,
      role: "DOCTOR",
    },
  });
  await db.doctor.create({
    data: {
      userId: user.id,
      crm,
      bio: d.bio.trim() || "Sem apresentação informada.",
      yearsExp: d.anosExperiencia,
      priceCents: Math.round(d.precoReais * 100),
      mode: d.modalidade,
      status: "PENDING",
      specialtyId: specialty.id,
    },
  });

  return NextResponse.json({ ok: true, nome, especialidade: specialty.name });
}
