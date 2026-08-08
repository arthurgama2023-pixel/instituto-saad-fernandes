import { NextRequest, NextResponse } from "next/server";
import { getPatientUser } from "@/lib/session";
import { db } from "@/lib/db";

/** Remove um endereço do paciente logado (só se for dele). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const endereco = await db.address.findUnique({ where: { id } });
  if (!endereco || endereco.userId !== user.id) {
    return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });
  }

  await db.address.delete({ where: { id } });

  // Se apagou o principal e ainda há outros, promove o mais antigo.
  if (endereco.principal) {
    const proximo = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (proximo) await db.address.update({ where: { id: proximo.id }, data: { principal: true } });
  }

  return NextResponse.json({ ok: true });
}

/** Define este endereço como principal. */
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });

  const endereco = await db.address.findUnique({ where: { id } });
  if (!endereco || endereco.userId !== user.id) {
    return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });
  }

  await db.address.updateMany({ where: { userId: user.id }, data: { principal: false } });
  await db.address.update({ where: { id }, data: { principal: true } });
  return NextResponse.json({ ok: true });
}
