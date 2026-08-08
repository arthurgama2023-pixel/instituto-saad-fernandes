import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/modules/notifications/mailer";
import { layout } from "@/modules/notifications/appointments";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function createToken(userId: string): Promise<string> {
  const token = randomUUID();
  await db.patientEmailLoginToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

/**
 * Envia o e-mail de confirmação do cadastro do paciente, com um link que já
 * loga (sem precisar do OTP por WhatsApp). Não lança — só loga o erro — para
 * nunca derrubar o cadastro por causa de e-mail.
 */
export async function enviarEmailConfirmacaoPaciente(userId: string): Promise<void> {
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    const token = await createToken(userId);
    const appUrl = process.env.APP_URL || "http://localhost:3080";
    const link = `${appUrl}/api/paciente/confirmar?token=${token}`;

    const html = layout(
      "Cadastro recebido ✅",
      `<p style="font-size:14px">Olá, ${user.name}! Sua conta no Smart Doctor foi criada.</p>
       <p style="font-size:14px;margin-top:16px">
         Clique no botão abaixo para confirmar e entrar direto no seu painel — vale por 24 horas e uma única vez:
       </p>
       <p style="margin:20px 0">
         <a href="${link}" style="background:#3fce3c;color:#0a1420;font-weight:bold;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;display:inline-block">
           Confirmar e entrar
         </a>
       </p>`,
    );

    await sendMail({ to: user.email, subject: "Confirme seu cadastro — Smart Doctor", html });
  } catch (e) {
    console.error(`[enviarEmailConfirmacaoPaciente] falha ao enviar e-mail (user ${userId}):`, e);
  }
}

export type ConfirmResult = { ok: true; userId: string } | { ok: false; error: "invalido_ou_expirado" };

/** Consome o token do link de confirmação. Vale uma vez. */
export async function confirmarEmailPaciente(token: string): Promise<ConfirmResult> {
  const entry = await db.patientEmailLoginToken.findUnique({ where: { token } });
  if (!entry || entry.used || entry.expiresAt < new Date()) {
    return { ok: false, error: "invalido_ou_expirado" };
  }
  await db.patientEmailLoginToken.update({ where: { id: entry.id }, data: { used: true } });
  return { ok: true, userId: entry.userId };
}
