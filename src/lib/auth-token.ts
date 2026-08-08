// Tokens de sessão opacos para clientes sem cookie jar (app mobile Expo).
// A web continua no cookie httpOnly (sd_uid); o mobile manda
// "Authorization: Bearer <token>". Ver getPatientUser() em lib/session.ts.

import { randomBytes } from "node:crypto";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// 60 dias — o app fica logado por bastante tempo; o token é revogável no logout.
const TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;
// Só reescreve lastUsedAt se passou mais de 1h, pra não escrever no banco a cada request.
const TOUCH_EVERY_MS = 60 * 60 * 1000;

/** Gera um token aleatório e o persiste amarrado ao usuário. Retorna o token em claro. */
export async function issueAuthToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url"); // ~43 chars, opaco
  await db.authToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

/** Resolve um Bearer token para o usuário, ou null se inválido/expirado/revogado. */
export async function resolveAuthToken(token: string): Promise<User | null> {
  if (!token) return null;
  const row = await db.authToken.findUnique({ where: { token }, include: { user: true } });
  if (!row || row.revoked) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  // toque preguiçoso em lastUsedAt (evita escrever a cada chamada)
  if (Date.now() - row.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await db.authToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  }
  return row.user;
}

/** Revoga um token (logout no app). Idempotente — silencioso se o token não existe. */
export async function revokeAuthToken(token: string): Promise<void> {
  if (!token) return;
  await db.authToken.updateMany({ where: { token }, data: { revoked: true } });
}
