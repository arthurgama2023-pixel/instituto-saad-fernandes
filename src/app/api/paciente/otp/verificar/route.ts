import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPatientOtp } from "@/modules/auth/patient-otp";
import { setPatientSession } from "@/lib/session";
import { issueAuthToken } from "@/lib/auth-token";

const Body = z.object({
  whatsapp: z.string().trim().min(8).max(20),
  codigo: z.string().trim().length(6),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Código deve ter 6 dígitos." }, { status: 400 });

  const res = await verifyPatientOtp(parsed.data.whatsapp, parsed.data.codigo);
  if (!res.ok) {
    const msg = res.error === "codigo_invalido" ? "Código incorreto ou expirado." : "Cadastro de paciente não encontrado.";
    return NextResponse.json({ error: msg }, { status: res.error === "codigo_invalido" ? 401 : 404 });
  }

  await setPatientSession(res.userId);
  // Token Bearer para o app mobile (a web ignora e usa o cookie acima).
  const token = await issueAuthToken(res.userId);
  return NextResponse.json({ ok: true, userId: res.userId, nome: res.nome, token });
}
