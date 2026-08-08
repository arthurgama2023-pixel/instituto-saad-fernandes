import { NextRequest, NextResponse } from "next/server";
import { confirmarEmailMedico } from "@/modules/auth/email-confirmacao";
import { setDoctorSession } from "@/lib/doctor-session";

/** Link do e-mail de confirmação do cadastro: valida o token e já loga o médico. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const res = await confirmarEmailMedico(token);

  if (!res.ok) {
    return NextResponse.redirect(new URL("/medico/login?erro=token", req.url));
  }

  await setDoctorSession(res.doctorId);
  return NextResponse.redirect(new URL("/medico", req.url));
}
