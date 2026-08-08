import { NextRequest, NextResponse } from "next/server";
import { confirmarEmailPaciente } from "@/modules/auth/email-confirmacao-paciente";
import { setPatientSession } from "@/lib/session";

/** Link do e-mail de confirmação do cadastro: valida o token e já loga o paciente. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const res = await confirmarEmailPaciente(token);

  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?erro=token", req.url));
  }

  await setPatientSession(res.userId);
  return NextResponse.redirect(new URL("/paciente", req.url));
}
