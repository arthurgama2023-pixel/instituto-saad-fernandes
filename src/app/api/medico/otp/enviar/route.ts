import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeeded } from "@/modules/catalog/seed";
import { sendOtp } from "@/modules/auth/otp";

const Body = z.object({ whatsapp: z.string().trim().min(8).max(20) });

export async function POST(req: NextRequest) {
  await ensureSeeded();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "WhatsApp inválido." }, { status: 400 });

  const res = await sendOtp(parsed.data.whatsapp);
  if (!res.ok) {
    const msg =
      res.error === "nao_cadastrado"
        ? "Não encontramos um cadastro de médico com esse WhatsApp."
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
