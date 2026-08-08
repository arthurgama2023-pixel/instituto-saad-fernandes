import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";

/** Métodos de acesso conectados à conta do paciente (só leitura). */
export async function GET() {
  const user = await getDemoUser();
  return NextResponse.json({
    whatsapp: user.phone ?? null,
    email: user.email ?? null,
    google: Boolean(user.googleId),
    criadaEm: user.createdAt,
  });
}
