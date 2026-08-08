import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getDemoUser();

  const cartao = await db.paymentCard.findUnique({ where: { id } });
  if (!cartao || cartao.userId !== user.id) {
    return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });
  }

  await db.paymentCard.delete({ where: { id } });

  if (cartao.principal) {
    const proximo = await db.paymentCard.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (proximo) await db.paymentCard.update({ where: { id: proximo.id }, data: { principal: true } });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getDemoUser();

  const cartao = await db.paymentCard.findUnique({ where: { id } });
  if (!cartao || cartao.userId !== user.id) {
    return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });
  }

  await db.paymentCard.updateMany({ where: { userId: user.id }, data: { principal: false } });
  await db.paymentCard.update({ where: { id }, data: { principal: true } });
  return NextResponse.json({ ok: true });
}
