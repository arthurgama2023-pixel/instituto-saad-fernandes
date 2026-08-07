import { NextRequest, NextResponse } from "next/server";
import { loginWithGoogle, type Area } from "@/modules/auth/google";
import { COOKIE, SESSION_COOKIE_OPTS } from "@/lib/session";

/** Retorno do Google: valida o state, troca o code, loga o usuário e grava a sessão. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("g_state")?.value;
  const area: Area = req.cookies.get("g_area")?.value === "medico" ? "medico" : "paciente";
  const back = area === "medico" ? "/medico/login" : "/entrar";

  // state ausente/divergente = possível CSRF ou o usuário cancelou no Google.
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL(`${back}?erro=1`, url.origin));
  }

  let userId: string;
  try {
    userId = await loginWithGoogle(code, area);
  } catch {
    return NextResponse.redirect(new URL(`${back}?erro=1`, url.origin));
  }

  const dest = area === "medico" ? "/medico" : "/paciente";
  const res = NextResponse.redirect(new URL(dest, url.origin));
  res.cookies.set(COOKIE, userId, SESSION_COOKIE_OPTS);
  res.cookies.delete("g_state");
  res.cookies.delete("g_area");
  return res;
}
