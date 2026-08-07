import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conferirSenha } from "@/lib/senha";
import { setDoctorSession } from "@/lib/doctor-session";

// Login real do médico: e-mail + senha (criada na ativação). Só entra quem tem
// senha definida E está com o cadastro ACTIVE (aprovado pelo admin). Mensagem
// genérica em erro de credencial pra não revelar se o e-mail existe.

const Body = z.object({
  email: z.string().trim().email().max(160),
  senha: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, senhaHash: true, doctor: { select: { id: true, status: true } } },
  });

  // Credencial inválida: mesma resposta pra e-mail inexistente ou senha errada.
  if (!user || user.role !== "DOCTOR" || !conferirSenha(parsed.data.senha, user.senhaHash)) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  if (!user.doctor) {
    return NextResponse.json({ error: "Cadastro de médico não encontrado." }, { status: 404 });
  }

  // Gate de aprovação: só médico ACTIVE entra.
  if (user.doctor.status !== "ACTIVE") {
    const msg =
      user.doctor.status === "PENDING"
        ? "Seu cadastro ainda está em análise. Você receberá um e-mail quando for aprovado."
        : "Seu acesso está suspenso. Fale com o suporte.";
    return NextResponse.json({ error: msg, status: user.doctor.status }, { status: 403 });
  }

  await setDoctorSession(user.doctor.id);
  return NextResponse.json({ ok: true, doctorId: user.doctor.id });
}
