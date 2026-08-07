import nodemailer, { type Transporter } from "nodemailer";

// Envio de e-mail via SMTP do Gmail. Precisa de uma "Senha de app" (conta com
// verificação em 2 etapas): GMAIL_USER + GMAIL_APP_PASSWORD no .env.
// Sem configuração, vira no-op (loga e segue) — o app nunca quebra por causa
// de e-mail.

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (!cached) {
    cached = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return cached;
}

export type MailInput = { to: string | string[]; subject: string; html: string };

/** Envia um e-mail. Retorna true se enviou, false se não há config (no-op). */
export async function sendMail({ to, subject, html }: MailInput): Promise<boolean> {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return false;

  const transport = getTransport();
  if (!transport) {
    console.warn(`[mailer] GMAIL_USER/GMAIL_APP_PASSWORD ausentes — e-mail "${subject}" não enviado (no-op).`);
    return false;
  }

  const from = `Smart Doctor <${process.env.GMAIL_USER}>`;
  await transport.sendMail({ from, to: recipients, subject, html });
  return true;
}
