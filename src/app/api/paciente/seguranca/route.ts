import { NextResponse } from "next/server";
import { getPatientUser } from "@/lib/session";

/** Métodos de acesso conectados à conta do paciente (só leitura). */
export async function GET() {
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  return NextResponse.json({
    whatsapp: user.phone ?? null,
    email: user.email ?? null,
    google: Boolean(user.googleId),
    criadaEm: user.createdAt,
  });
}
