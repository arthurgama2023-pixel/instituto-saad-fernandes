// Sessão demo do MVP: um paciente por navegador via cookie.
// B2 substitui por OTP de WhatsApp (Etapa 3 §2.2).

import { cookies, headers } from "next/headers";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { resolveAuthToken } from "@/lib/auth-token";

export const COOKIE = "sd_uid";
export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

/** Grava a sessão de um paciente já autenticado (cadastro ou login por OTP). */
export async function setPatientSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, userId, SESSION_COOKIE_OPTS);
}

export async function getDemoUser() {
  const jar = await cookies();
  const uid = jar.get(COOKIE)?.value;
  if (uid) {
    const user = await db.user.findUnique({ where: { id: uid } });
    if (user) return user;
  }
  const user = await db.user.create({ data: { name: "Marina Costa", role: "PATIENT" } });
  jar.set(COOKIE, user.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return user;
}

/** Extrai o token de um header "Authorization: Bearer <token>", ou null. */
export async function bearerToken(): Promise<string | null> {
  const authz = (await headers()).get("authorization");
  if (!authz) return null;
  const [scheme, value] = authz.split(" ");
  return scheme?.toLowerCase() === "bearer" && value ? value.trim() : null;
}

/**
 * Resolve o paciente autenticado para clientes web E mobile.
 *
 * - Mobile (app Expo): manda "Authorization: Bearer <token>". Token válido →
 *   usuário; token presente mas inválido/expirado → null (a rota responde 401).
 * - Web: sem Bearer, cai no cookie httpOnly (getDemoUser), que cria o paciente
 *   demo se preciso — comportamento atual inalterado.
 *
 * O único caso de retorno null é Bearer presente e inválido; a web nunca vê null.
 */
export async function getPatientUser(): Promise<User | null> {
  const token = await bearerToken();
  if (token) return resolveAuthToken(token); // não cria demo silenciosamente
  return getDemoUser();
}
