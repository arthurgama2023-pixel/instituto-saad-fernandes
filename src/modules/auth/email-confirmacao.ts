import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/modules/notifications/mailer";
import { layout, linha } from "@/modules/notifications/appointments";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Cria o token do e-mail de confirmação do cadastro do médico. */
async function createToken(doctorId: string): Promise<string> {
  const token = randomUUID();
  await db.emailLoginToken.create({
    data: { token, doctorId, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

/**
 * Envia o e-mail de confirmação do cadastro do médico, com um link que já loga
 * (sem precisar do OTP por WhatsApp). Não lança — só loga o erro — para nunca
 * derrubar o cadastro por causa de e-mail.
 */
export async function enviarEmailConfirmacaoMedico(doctorId: string): Promise<void> {
  try {
    const doctor = await db.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true, specialty: true },
    });
    if (!doctor?.user.email) return;

    const token = await createToken(doctorId);
    const appUrl = process.env.APP_URL || "http://localhost:3080";
    const link = `${appUrl}/api/medico/confirmar?token=${token}`;

    const html = layout(
      "Cadastro recebido ✅",
      `<p style="font-size:14px">Olá, ${doctor.user.name}! Recebemos seu cadastro no Smart Doctor.</p>
       ${linha("Especialidade", doctor.specialty.name)}
       ${linha("CRM", doctor.crm)}
       <p style="font-size:14px;margin-top:16px">
         Clique no botão abaixo para confirmar e entrar direto no seu painel — vale por 24 horas e uma única vez:
       </p>
       <p style="margin:20px 0">
         <a href="${link}" style="background:#3fce3c;color:#0a1420;font-weight:bold;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;display:inline-block">
           Confirmar e entrar
         </a>
       </p>
       <p style="font-size:12px;color:#6b7280">
         Seu acesso ainda passa por uma verificação da nossa equipe antes de ficar visível para pacientes. Você já pode entrar no painel para completar seu perfil.
       </p>`,
    );

    await sendMail({ to: doctor.user.email, subject: "Confirme seu cadastro — Smart Doctor", html });
  } catch (e) {
    console.error(`[enviarEmailConfirmacaoMedico] falha ao enviar e-mail (doctor ${doctorId}):`, e);
  }
}

export type ConfirmResult = { ok: true; doctorId: string } | { ok: false; error: "invalido_ou_expirado" };

/** Consome o token do link de confirmação. Vale uma vez. */
export async function confirmarEmailMedico(token: string): Promise<ConfirmResult> {
  const entry = await db.emailLoginToken.findUnique({ where: { token } });
  if (!entry || entry.used || entry.expiresAt < new Date()) {
    return { ok: false, error: "invalido_ou_expirado" };
  }
  await db.emailLoginToken.update({ where: { id: entry.id }, data: { used: true } });
  return { ok: true, doctorId: entry.doctorId };
}
