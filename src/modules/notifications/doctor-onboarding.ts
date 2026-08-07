import crypto from "node:crypto";
import { db } from "@/lib/db";
import { sendMail } from "./mailer";
import { layout } from "./appointments";

// E-mail de aprovação do médico. Quando o admin aprova, geramos um token de
// ativação de uso único e mandamos o link pra ele criar login + senha. Sem
// GMAIL configurado, sendMail é no-op (loga) — por isso devolvemos o link, pra
// o fluxo ser testável em dev sem e-mail.

const DIAS_VALIDADE = 7;

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3080";
}

function corpoEmail(nome: string, link: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] || "Doutor(a)";
  return layout(
    "Seu cadastro foi aprovado ✅",
    `<p style="font-size:14px">Olá, ${primeiro}! Seu cadastro no Smart Doctor foi aprovado pela nossa equipe.</p>
     <p style="font-size:14px">Para começar a atender, crie seu acesso (login e senha):</p>
     <p style="text-align:center;margin:24px 0">
       <a href="${link}" style="background:#07845a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:bold;display:inline-block">
         Criar meu acesso
       </a>
     </p>
     <p style="font-size:12px;color:#6b7280">Ou copie e cole no navegador:<br>${link}</p>
     <p style="font-size:12px;color:#6b7280">Este link vale por ${DIAS_VALIDADE} dias.</p>`,
  );
}

/**
 * Gera o token de ativação, guarda no User e manda o e-mail de aprovação.
 * Retorna o link de ativação (útil em dev sem e-mail), ou null se não achar o
 * usuário. Nunca lança — falha de e-mail não derruba a aprovação.
 */
export async function gerarAtivacaoEnotificar(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return null;

  const token = crypto.randomBytes(24).toString("hex");
  await db.user.update({
    where: { id: userId },
    data: { ativacaoToken: token, ativacaoExpira: new Date(Date.now() + DIAS_VALIDADE * 86400000) },
  });

  const link = `${appUrl()}/medico/ativar?token=${token}`;

  if (user.email) {
    try {
      await sendMail({ to: user.email, subject: "Cadastro aprovado — crie seu acesso ao Smart Doctor", html: corpoEmail(user.name, link) });
    } catch (e) {
      console.error("[onboarding] falha ao enviar e-mail de aprovação:", e);
    }
  } else {
    console.warn("[onboarding] médico aprovado sem e-mail cadastrado — só o link de ativação (dev):", link);
  }

  return link;
}
