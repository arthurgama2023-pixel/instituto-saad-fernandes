import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getDemoUser();
  const cartoes = await db.paymentCard.findMany({
    where: { userId: user.id },
    orderBy: [{ principal: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ cartoes });
}

// DEMO: recebemos o número só para deduzir bandeira e últimos 4 — e descartamos.
// Num app real o número NUNCA chega ao nosso servidor: o cartão é tokenizado no
// cliente pelo gateway (ex.: Stripe.js) e só o token trafega.
const Body = z.object({
  numero: z.string().trim().min(13).max(19),
  holder: z.string().trim().min(2).max(120),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024).max(2100),
  principal: z.boolean().optional().default(false),
});

function deduzirBandeira(numero: string): string {
  const n = numero.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(4011|4312|4389|5041|5067|6277|6362|6363|650)/.test(n)) return "Elo";
  if (/^(606282|3841)/.test(n)) return "Hipercard";
  return "Cartão";
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os dados do cartão." }, { status: 400 });

  const user = await getDemoUser();
  const d = parsed.data;
  const digits = d.numero.replace(/\D/g, "");

  const total = await db.paymentCard.count({ where: { userId: user.id } });
  const principal = d.principal || total === 0;
  if (principal) {
    await db.paymentCard.updateMany({ where: { userId: user.id }, data: { principal: false } });
  }

  const cartao = await db.paymentCard.create({
    data: {
      userId: user.id,
      brand: deduzirBandeira(digits),
      last4: digits.slice(-4),
      holder: d.holder.trim(),
      expMonth: d.expMonth,
      expYear: d.expYear,
      principal,
    },
  });
  // Devolve só o que é seguro exibir — o número completo nunca foi persistido.
  return NextResponse.json({ ok: true, cartao });
}
