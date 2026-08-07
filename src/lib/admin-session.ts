import { cookies } from "next/headers";
import crypto from "node:crypto";

// Sessão do painel admin. Sem tabela de admin: a credencial vem do ambiente
// (ADMIN_USER + ADMIN_PASSWORD) e a sessão é um cookie httpOnly cujo valor é um
// token HMAC-SHA256 derivado da senha. Sem a senha no servidor, ninguém forja o
// cookie; a verificação recomputa o token e compara — stateless.

const COOKIE = "sd_admin";

function adminUser(): string | null {
  return process.env.ADMIN_USER || null;
}
function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

/** true quando o servidor tem ADMIN_USER e ADMIN_PASSWORD configurados. */
export function credenciaisConfiguradas(): boolean {
  return adminUser() !== null && adminPassword() !== null;
}

/** Compara duas strings em tempo constante (evita timing attack na senha). */
function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Confere usuário + senha contra o ambiente. */
export function conferirCredenciais(user: string, senha: string): boolean {
  const u = adminUser();
  const p = adminPassword();
  if (!u || !p) return false;
  return igualSeguro(user, u) && igualSeguro(senha, p);
}

/** Token de sessão derivado da senha — só reproduzível por quem tem ADMIN_PASSWORD. */
function tokenAdmin(): string | null {
  const p = adminPassword();
  if (!p) return null;
  return crypto.createHmac("sha256", p).update("sd-admin-v1").digest("hex");
}

export async function setAdminSession() {
  const token = tokenAdmin();
  if (!token) return;
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Sessão de admin válida? Recomputa o token e compara com o cookie. */
export async function isAdminAuthed(): Promise<boolean> {
  const esperado = tokenAdmin();
  if (!esperado) return false; // sem credencial configurada, ninguém entra
  const jar = await cookies();
  const cookie = jar.get(COOKIE)?.value;
  if (!cookie) return false;
  return igualSeguro(cookie, esperado);
}
