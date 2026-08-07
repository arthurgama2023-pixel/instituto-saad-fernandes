import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashSenha } from "@/lib/senha";

// Ativação do acesso do médico: o link vem do e-mail de aprovação com um token
// de uso único. GET valida o token e devolve nome/e-mail pra pré-preencher a
// tela; POST grava a senha (hash) e o e-mail de login, e queima o token.

async function medicoPorToken(token: string) {
  if (!token) return null;
  const user = await db.user.findUnique({
    where: { ativacaoToken: token },
    select: { id: true, name: true, email: true, ativacaoExpira: true, role: true },
  });
  if (!user || user.role !== "DOCTOR") return null;
  if (!user.ativacaoExpira || user.ativacaoExpira.getTime() < Date.now()) return null; // expirado
  return user;
}

/** Valida o token e devolve dados pra pré-preencher a tela de ativação. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const user = await medicoPorToken(token);
  if (!user) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
  return NextResponse.json({ nome: user.name, email: user.email });
}

const Body = z.object({
  token: z.string().min(1),
  email: z.string().trim().email().max(160),
  senha: z.string().min(6).max(200),
});

/** Cria o acesso: grava e-mail de login + senha (hash) e invalida o token. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira o e-mail e uma senha de ao menos 6 caracteres." }, { status: 400 });
  }
  const { token, senha } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const user = await medicoPorToken(token);
  if (!user) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });

  // E-mail é @unique: só bloqueia se já for de OUTRO usuário.
  const dono = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (dono && dono.id !== user.id) {
    return NextResponse.json({ error: "Este e-mail já está em uso por outra conta." }, { status: 409 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { email, senhaHash: hashSenha(senha), ativacaoToken: null, ativacaoExpira: null },
  });

  return NextResponse.json({ ok: true });
}
