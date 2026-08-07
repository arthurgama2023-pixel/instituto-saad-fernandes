import { db } from "@/lib/db";
import { fmtSlot, fmtMoney } from "@/modules/shared/format";
import { sendMail } from "./mailer";

export type NotiKind = "confirmacao" | "cancelamento" | "lembrete";

/** Texto do marco de lembrete conforme a antecedência (em minutos). */
function lembreteLabel(offsetMin?: number): { curto: string; frase: string } {
  if (offsetMin === 1440) return { curto: "amanhã", frase: "sua consulta é amanhã" };
  if (offsetMin === 60) return { curto: "em 1 hora", frase: "sua consulta começa em 1 hora" };
  if (offsetMin === 30) return { curto: "em 30 minutos", frase: "sua consulta começa em 30 minutos" };
  return { curto: "em breve", frase: "sua consulta está chegando" };
}

const APP_NAME = "Smart Doctor";

function layout(titulo: string, corpo: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0a1420">
    <div style="background:#07845a;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:18px">🩺 ${APP_NAME}</h1>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <h2 style="margin:0 0 12px;font-size:16px;color:#07845a">${titulo}</h2>
      ${corpo}
      <p style="margin-top:24px;font-size:12px;color:#6b7280">
        Você recebeu este e-mail porque tem uma consulta no ${APP_NAME}.
      </p>
    </div>
  </div>`;
}

function linha(label: string, valor: string): string {
  return `<p style="margin:6px 0;font-size:14px"><strong>${label}:</strong> ${valor}</p>`;
}

/**
 * Notifica paciente e médico (nos e-mails cadastrados) sobre um evento da
 * consulta. Nunca lança — só loga —, para não derrubar o fluxo que a chamou.
 */
export async function notifyAppointment(
  appointmentId: string,
  kind: NotiKind,
  opts?: { offsetMin?: number },
): Promise<void> {
  try {
    const appt = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true, specialty: true } },
      },
    });
    if (!appt) return;

    const paciente = appt.patient.name;
    const medico = appt.doctor.user.name;
    const especialidade = appt.doctor.specialty.name;
    const quando = fmtSlot(appt.startsAt.toISOString());
    const valor = fmtMoney(appt.priceCents);

    const destinatarios = [appt.patient.email, appt.doctor.user.email].filter(
      (e): e is string => Boolean(e),
    );
    if (destinatarios.length === 0) return;

    const detalhes =
      linha("Médico", `${medico} (${especialidade})`) +
      linha("Quando", quando) +
      linha("Valor", valor) +
      linha("Formato", appt.mode === "VIDEO" ? "Teleconsulta (vídeo)" : "Presencial");

    let subject: string;
    let html: string;

    if (kind === "confirmacao") {
      subject = `Consulta confirmada · ${especialidade} ${quando}`;
      html = layout(
        "Sua consulta está confirmada ✅",
        `<p style="font-size:14px">Olá, ${paciente}! Pagamento confirmado e consulta marcada.</p>${detalhes}
         <p style="font-size:14px;margin-top:16px">O link da sala de vídeo fica disponível na hora da consulta, dentro do app.</p>`,
      );
    } else if (kind === "cancelamento") {
      subject = `Consulta cancelada · ${especialidade} ${quando}`;
      html = layout(
        "Consulta cancelada",
        `<p style="font-size:14px">Olá, ${paciente}. A consulta abaixo foi cancelada.</p>${detalhes}
         <p style="font-size:14px;margin-top:16px">Se houve pagamento, o reembolso é processado automaticamente.</p>`,
      );
    } else {
      const { curto, frase } = lembreteLabel(opts?.offsetMin);
      subject = `Lembrete: consulta ${curto} · ${especialidade}`;
      html = layout(
        "Lembrete da sua consulta ⏰",
        `<p style="font-size:14px">Olá, ${paciente}! Passando para lembrar: ${frase}.</p>${detalhes}
         <p style="font-size:14px;margin-top:16px">Entre pela sala de vídeo no app alguns minutos antes.</p>`,
      );
    }

    await sendMail({ to: destinatarios, subject, html });
  } catch (e) {
    console.error(`[notifyAppointment] falha ao notificar (${kind}) ${appointmentId}:`, e);
  }
}

const TIPO_DOC_LABEL: Record<string, string> = {
  RECEITA: "receita",
  ATESTADO: "atestado",
  EXAME: "exame",
  OUTRO: "documento",
};

/** Avisa o paciente que um novo documento (receita/atestado/exame) chegou no app. */
export async function notifyDocumento(documentoId: string): Promise<void> {
  try {
    const doc = await db.documento.findUnique({
      where: { id: documentoId },
      select: {
        tipo: true,
        titulo: true,
        patient: { select: { name: true, email: true } },
        doctor: { include: { user: true } },
      },
    });
    if (!doc?.patient.email) return;

    const rotulo = TIPO_DOC_LABEL[doc.tipo] ?? "documento";
    const subject = `Novo ${rotulo} no app · ${doc.titulo}`;
    const html = layout(
      `Você recebeu um ${rotulo} 📄`,
      `<p style="font-size:14px">Olá, ${doc.patient.name}! ${doc.doctor.user.name} disponibilizou um ${rotulo} para você:</p>
       ${linha("Documento", doc.titulo)}
       <p style="font-size:14px;margin-top:16px">Abra o app, na aba <strong>Exames e documentos</strong>, para visualizar e baixar.</p>`,
    );
    await sendMail({ to: doc.patient.email, subject, html });
  } catch (e) {
    console.error(`[notifyDocumento] falha ao notificar documento ${documentoId}:`, e);
  }
}
