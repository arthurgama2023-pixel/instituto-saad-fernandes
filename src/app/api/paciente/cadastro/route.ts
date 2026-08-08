import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/modules/auth/otp";
import { setPatientSession } from "@/lib/session";
import { enviarEmailConfirmacaoPaciente } from "@/modules/auth/email-confirmacao-paciente";

const Body = z.object({
  nome: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().min(8).max(20),
  email: z.string().trim().max(160).optional().default(""),
});

/** Cadastro de paciente: cria a conta e já loga (sem aprovação — diferente do médico). */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha nome e WhatsApp válidos." }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.whatsapp);
  const existente = await db.user.findUnique({ where: { phone } });
  if (existente) {
    return NextResponse.json(
      { error: "Já existe uma conta com esse WhatsApp. Faça login." },
      { status: 409 },
    );
  }

  // E-mail é opcional e @unique — vazio/duplicado vira null pra não travar o cadastro.
  const emailNorm = parsed.data.email.trim().toLowerCase() || null;
  const emailLivre = emailNorm && !(await db.user.findUnique({ where: { email: emailNorm } })) ? emailNorm : null;

  const user = await db.user.create({
    data: { name: parsed.data.nome.trim(), phone, email: emailLivre, role: "PATIENT" },
  });
  await setPatientSession(user.id);
  await enviarEmailConfirmacaoPaciente(user.id);

  return NextResponse.json({ ok: true, nome: user.name });
}
