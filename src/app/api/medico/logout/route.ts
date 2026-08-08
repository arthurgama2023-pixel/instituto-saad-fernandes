import { NextRequest, NextResponse } from "next/server";
import { COOKIE as DOCTOR_COOKIE } from "@/lib/doctor-session";
import { COOKIE as PATIENT_COOKIE } from "@/lib/session";

/**
 * Sai da conta do médico. Limpa os dois cookies possíveis: sd_doctor (login
 * por OTP/e-mail) e sd_uid (login social Google, que reaproveita o cookie do
 * paciente) — getAuthedDoctorId() aceita qualquer um dos dois.
 */
function logout(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/medico/login", req.nextUrl.origin));
  res.cookies.delete(DOCTOR_COOKIE);
  res.cookies.delete(PATIENT_COOKIE);
  return res;
}

export const GET = logout;
export const POST = logout;
