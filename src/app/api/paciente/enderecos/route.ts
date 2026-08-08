import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPatientUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const enderecos = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ principal: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ enderecos });
}

const Body = z.object({
  label: z.string().trim().max(40).optional().default("Casa"),
  cep: z.string().trim().min(8).max(9),
  logradouro: z.string().trim().min(2).max(120),
  numero: z.string().trim().max(20),
  complemento: z.string().trim().max(60).optional().default(""),
  bairro: z.string().trim().min(2).max(80),
  cidade: z.string().trim().min(2).max(80),
  uf: z.string().trim().length(2),
  principal: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Preencha o endereço corretamente." }, { status: 400 });

  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const d = parsed.data;

  // Primeiro endereço vira principal automaticamente.
  const total = await db.address.count({ where: { userId: user.id } });
  const principal = d.principal || total === 0;
  if (principal) {
    await db.address.updateMany({ where: { userId: user.id }, data: { principal: false } });
  }

  const endereco = await db.address.create({
    data: {
      userId: user.id,
      label: d.label || "Casa",
      cep: d.cep,
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento || null,
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      principal,
    },
  });
  return NextResponse.json({ ok: true, endereco });
}
