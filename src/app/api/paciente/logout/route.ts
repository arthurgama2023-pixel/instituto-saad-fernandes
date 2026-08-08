import { NextResponse } from "next/server";
import { COOKIE, bearerToken } from "@/lib/session";
import { revokeAuthToken } from "@/lib/auth-token";

/**
 * Logout do app mobile: revoga o Bearer token atual (para o app descartar do
 * secure-store) e, por via das dúvidas, também limpa o cookie da web. Responde
 * JSON — diferente de /api/auth/logout, que redireciona para o portal.
 */
export async function POST() {
  const token = await bearerToken();
  if (token) await revokeAuthToken(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
