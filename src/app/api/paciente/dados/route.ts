import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser } from "@/lib/session";
import { normalizePhone } from "@/modules/auth/otp";
import { db } from "@/lib/db";

/** Dados pessoais do paciente logado. */
export async function GET() {
  const user = await getDemoUser();
  return NextResponse.json({
    name: user.name,
    email: user.email ?? "",
    phone: user.phone ?? "",
  });
}

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(20).optional().default(""),
});

export async function PUT(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os campos e tente de novo." }, { status: 400 });

  const user = await getDemoUser();
  const d = parsed.data;

  // email e phone são @unique — checa se o novo valor já é de outra conta.
  const emailNorm = d.email.trim().toLowerCase() || null;
  if (emailNorm) {
    const dono = await db.user.findUnique({ where: { email: emailNorm } });
    if (dono && dono.id !== user.id) {
      return NextResponse.json({ error: "Esse e-mail já está em uso por outra conta." }, { status: 409 });
    }
  }

  const phoneNorm = d.phone.trim() ? normalizePhone(d.phone) : null;
  if (phoneNorm) {
    const dono = await db.user.findUnique({ where: { phone: phoneNorm } });
    if (dono && dono.id !== user.id) {
      return NextResponse.json({ error: "Esse telefone já está em uso por outra conta." }, { status: 409 });
    }
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { name: d.name.trim(), email: emailNorm, phone: phoneNorm },
  });

  return NextResponse.json({ ok: true, name: updated.name, email: updated.email ?? "", phone: updated.phone ?? "" });
}
