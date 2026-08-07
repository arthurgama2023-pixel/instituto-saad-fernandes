import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/modules/auth/google";

/** Inicia o login Google: gera state (CSRF), guarda em cookie e redireciona ao consentimento. */
export async function GET(req: NextRequest) {
  const area = req.nextUrl.searchParams.get("area") === "medico" ? "medico" : "paciente";
  const state = crypto.randomUUID();

  let authUrl: string;
  try {
    authUrl = buildAuthUrl(state);
  } catch {
    // Sem credenciais configuradas: volta pro login com aviso em vez de estourar.
    const back = area === "medico" ? "/medico/login" : "/entrar";
    return NextResponse.redirect(new URL(`${back}?erro=config`, req.nextUrl.origin));
  }

  const res = NextResponse.redirect(authUrl);
  const opts = { httpOnly: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set("g_state", state, opts);
  res.cookies.set("g_area", area, opts);
  return res;
}
