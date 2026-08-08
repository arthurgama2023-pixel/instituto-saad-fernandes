import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPatientOtp } from "@/modules/auth/patient-otp";

const Body = z.object({ whatsapp: z.string().trim().min(8).max(20) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "WhatsApp inválido." }, { status: 400 });

  const res = await sendPatientOtp(parsed.data.whatsapp);
  if (!res.ok) {
    const msg =
      res.error === "nao_cadastrado"
        ? "Não encontramos uma conta com esse WhatsApp. Cadastre-se primeiro."
        : "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    return NextResponse.json({ error: msg }, { status: res.error === "nao_cadastrado" ? 404 : 429 });
  }

  return NextResponse.json({
    ok: true,
    nome: res.nome,
    // MVP: código devolvido para exibir na tela. Ao conectar o WhatsApp, o envio
    // da mensagem substitui isso e devCode deixa de ser retornado.
    devCode: res.devCode,
  });
}
