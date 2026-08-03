import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/modules/auth/otp";
import { setDoctorSession } from "@/lib/doctor-session";

const Body = z.object({
  whatsapp: z.string().trim().min(8).max(20),
  codigo: z.string().trim().length(6),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Código deve ter 6 dígitos." }, { status: 400 });

  const res = await verifyOtp(parsed.data.whatsapp, parsed.data.codigo);
  if (!res.ok) {
    const msg = res.error === "codigo_invalido" ? "Código incorreto ou expirado." : "Cadastro de médico não encontrado.";
    return NextResponse.json({ error: msg }, { status: res.error === "codigo_invalido" ? 401 : 404 });
  }

  await setDoctorSession(res.doctorId);
  return NextResponse.json({ ok: true, doctorId: res.doctorId, nome: res.nome });
}
