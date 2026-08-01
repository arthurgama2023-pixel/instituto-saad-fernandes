// Parser local PT-BR — modo demo sem ANTHROPIC_API_KEY e fallback se o provedor cair.
// Máquina de estados simples que cobre o fluxo canônico (Etapa 3 §3.2):
// sintoma → especialidade → médicos → horário → confirmação → PIX.

import { matchSpecialty, searchDoctors, listSpecialties } from "@/modules/catalog/service";
import { getNextSlots, holdSlot, myAppointments, cancelAppointment } from "@/modules/scheduling/service";
import { createCharge } from "@/modules/payments/service";
import { fmtMoney, fmtSlot } from "@/modules/shared/format";
import type { UiEvent } from "@/modules/conversation/service";

export type LocalState = {
  step?:
    | "awaiting_symptom"
    | "choosing_doctor"
    | "choosing_slot"
    | "confirming"
    | "awaiting_payment"
    | "choosing_cancel"
    | "confirm_cancel";
  doctors?: { id: string; name: string; priceCents: number; specialty: string }[];
  chosenDoctorId?: string;
  chosenDoctorName?: string;
  chosenPriceCents?: number;
  slots?: string[];
  chosenSlot?: string;
  appointmentId?: string;
  cancelIds?: string[];
  cancelChosenId?: string;
};

export type LocalResult = {
  text: string;
  uiEvents: UiEvent[];
  quickReplies: string[];
  newState: LocalState;
};

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const isGreeting = (t: string) => /^(oi|ola|hey|eai|e ai|bom dia|boa tarde|boa noite)[\s!.,]*$/.test(norm(t));
const parseNumber = (t: string): number | null => {
  const m = norm(t).match(/^\s*(\d{1,2})\b/);
  return m ? parseInt(m[1], 10) : null;
};
const saysYes = (t: string) => /^(1|sim|s|confirmo|confirmar|pode|isso|ok|quero)\b/.test(norm(t));
const saysNo = (t: string) => /^(2|nao|não|n|outro)\b/.test(norm(t));

const WELCOME =
  "Oi! 👋 Sou a *Clara*, assistente inteligente do Smart Doctor.\n" +
  "Posso marcar consultas, mostrar sua agenda e cuidar de tudo por aqui.\n\n" +
  "Me conta: *o que você está sentindo* ou o que precisa?";

const WELCOME_CHIPS = ["Meu cabelo está caindo", "Problema de pele", "Check-up de rotina", "Minhas consultas"];

export async function runLocalAgent(
  userId: string,
  userName: string,
  text: string,
  state: LocalState,
): Promise<LocalResult> {
  const uiEvents: UiEvent[] = [];
  const t = norm(text);

  // ── comandos globais (valem em qualquer passo) ─────────────────────────────
  if (/minhas consultas|minha agenda|ver consultas?/.test(t)) {
    return listMine(userId, uiEvents);
  }
  if (/^cancelar/.test(t) && !["choosing_cancel", "confirm_cancel"].includes(state.step ?? "")) {
    return startCancel(userId, uiEvents);
  }

  switch (state.step) {
    case "choosing_doctor": {
      const n = parseNumber(text);
      const doctors = state.doctors ?? [];
      if (n === null || n < 1 || n > doctors.length) {
        return {
          text: `Só me responde o número do médico (1 a ${doctors.length}) 😉`,
          uiEvents,
          quickReplies: doctors.map((_, i) => String(i + 1)),
          newState: state,
        };
      }
      const chosen = doctors[n - 1];
      const slots = await getNextSlots(chosen.id, 4);
      if (slots.length === 0) {
        return {
          text: `Puxa, ${chosen.name} está sem horários próximos. Quer ver outro médico? Responda o número.`,
          uiEvents,
          quickReplies: doctors.map((_, i) => String(i + 1)),
          newState: state,
        };
      }
      const list = slots.map((s, i) => `${i + 1} - ${fmtSlot(s)}`).join("\n");
      return {
        text:
          `Ótima escolha! *${chosen.name}* — ${fmtMoney(chosen.priceCents)} por vídeo 📹\n\n` +
          `Horários disponíveis:\n${list}\n\nQual prefere? (responda o número)`,
        uiEvents,
        quickReplies: slots.map((_, i) => String(i + 1)),
        newState: {
          step: "choosing_slot",
          chosenDoctorId: chosen.id,
          chosenDoctorName: chosen.name,
          chosenPriceCents: chosen.priceCents,
          slots,
        },
      };
    }

    case "choosing_slot": {
      const n = parseNumber(text);
      const slots = state.slots ?? [];
      if (n === null || n < 1 || n > slots.length) {
        return {
          text: `Me responde o número do horário (1 a ${slots.length}) 🙂`,
          uiEvents,
          quickReplies: slots.map((_, i) => String(i + 1)),
          newState: state,
        };
      }
      const chosenSlot = slots[n - 1];
      return {
        text:
          `Confirmando ✨\n📅 *${state.chosenDoctorName}* — ${fmtSlot(chosenSlot)}\n` +
          `📹 Teleconsulta · ${fmtMoney(state.chosenPriceCents ?? 0)}\n\n` +
          `Posso reservar? (1 - Sim · 2 - Outro horário)`,
        uiEvents,
        quickReplies: ["1 — Confirmar", "2 — Outro horário"],
        newState: { ...state, step: "confirming", chosenSlot },
      };
    }

    case "confirming": {
      if (saysNo(text)) {
        const slots = await getNextSlots(state.chosenDoctorId!, 4);
        const list = slots.map((s, i) => `${i + 1} - ${fmtSlot(s)}`).join("\n");
        return {
          text: `Sem problema! Outros horários:\n${list}`,
          uiEvents,
          quickReplies: slots.map((_, i) => String(i + 1)),
          newState: { ...state, step: "choosing_slot", slots },
        };
      }
      if (!saysYes(text)) {
        return {
          text: "Me confirma com *1* (sim) ou *2* (outro horário)?",
          uiEvents,
          quickReplies: ["1 — Confirmar", "2 — Outro horário"],
          newState: state,
        };
      }
      const hold = await holdSlot(userId, state.chosenDoctorId!, state.chosenSlot!);
      if (!hold.ok) {
        const slots = await getNextSlots(state.chosenDoctorId!, 4);
        const list = slots.map((s, i) => `${i + 1} - ${fmtSlot(s)}`).join("\n");
        return {
          text: `Poxa, esse horário acabou de ser reservado 😔 Estes continuam livres:\n${list}`,
          uiEvents,
          quickReplies: slots.map((_, i) => String(i + 1)),
          newState: { ...state, step: "choosing_slot", slots },
        };
      }
      const payment = await createCharge(hold.appointmentId);
      if (payment) {
        uiEvents.push({
          type: "payment",
          payment: {
            id: payment.id,
            pixCode: payment.pixCode,
            amountCents: payment.amountCents,
            status: payment.status,
          },
        });
      }
      return {
        text:
          `Segurei o horário por *15 minutos* ⏱\n\n` +
          `Para confirmar, é só pagar o PIX de *${fmtMoney(hold.priceCents)}* no cartão aqui embaixo.\n` +
          `_(Neste demo, clique em "Simular pagamento PIX")_`,
        uiEvents,
        quickReplies: [],
        newState: { step: "awaiting_payment", appointmentId: hold.appointmentId },
      };
    }

    case "awaiting_payment": {
      return {
        text:
          "Sua reserva está ativa ⏱ É só concluir o PIX no cartão acima que eu confirmo tudo na hora.\n" +
          "_(No demo: botão \"Simular pagamento PIX\")_",
        uiEvents,
        quickReplies: ["Minhas consultas"],
        newState: state,
      };
    }

    case "choosing_cancel": {
      const n = parseNumber(text);
      const ids = state.cancelIds ?? [];
      if (n === null || n < 1 || n > ids.length) {
        return { text: `Responda o número da consulta (1 a ${ids.length}).`, uiEvents, quickReplies: [], newState: state };
      }
      return {
        text: "Tem certeza que quer cancelar? Se já estiver paga, o estorno integral sai em até 5 dias úteis. (1 - Sim · 2 - Não)",
        uiEvents,
        quickReplies: ["1 — Sim, cancelar", "2 — Não"],
        newState: { step: "confirm_cancel", cancelChosenId: ids[n - 1] },
      };
    }

    case "confirm_cancel": {
      if (!saysYes(text)) {
        return { text: "Cancelamento abortado — sua consulta continua de pé ✓", uiEvents, quickReplies: ["Minhas consultas"], newState: {} };
      }
      const res = await cancelAppointment(state.cancelChosenId!, userId);
      if (!res.ok) return { text: "Não encontrei essa consulta ativa.", uiEvents, quickReplies: [], newState: {} };
      return {
        text: `Consulta cancelada ✓ ${res.refunded ? "O estorno integral cai em até 5 dias úteis." : ""}\nSe precisar remarcar, é só me chamar 💙`,
        uiEvents,
        quickReplies: ["Marcar nova consulta"],
        newState: {},
      };
    }
  }

  // ── sem passo ativo: saudação ou triagem de sintoma ───────────────────────
  if (isGreeting(text)) {
    return { text: WELCOME, uiEvents, quickReplies: WELCOME_CHIPS, newState: { step: "awaiting_symptom" } };
  }

  const specialty = await matchSpecialty(text);
  if (!specialty) {
    const specs = await listSpecialties();
    return {
      text:
        "Entendi! Só não consegui identificar a especialidade certa ainda. 🤔\n" +
        "Pode me contar com outras palavras, ou escolher uma área:\n" +
        specs.map((s) => `${s.icon} ${s.name}`).join(" · "),
      uiEvents,
      quickReplies: specs.map((s) => s.name),
      newState: { step: "awaiting_symptom" },
    };
  }

  const doctors = await searchDoctors({ specialtySlug: specialty.slug });
  if (doctors.length === 0) {
    return {
      text: `Isso é área da *${specialty.name}*, mas estou sem médicos disponíveis nela agora. Quer tentar outra área?`,
      uiEvents,
      quickReplies: [],
      newState: { step: "awaiting_symptom" },
    };
  }

  uiEvents.push({ type: "doctors", items: doctors });
  const list = doctors
    .map(
      (d, i) =>
        `*${i + 1} - ${d.name}* ★${d.rating}\n     ${fmtMoney(d.priceCents)} · próximo: ${d.nextSlots[0] ? fmtSlot(d.nextSlots[0]) : "consultar"}`,
    )
    .join("\n");
  return {
    text:
      `Entendi 💙 Isso é assunto para a *${specialty.name}* ${specialty.icon}\n\n` +
      `Encontrei ${doctors.length} especialistas com horário próximo:\n${list}\n\n` +
      `Qual você prefere? (responda o número)`,
    uiEvents,
    quickReplies: doctors.map((_, i) => String(i + 1)),
    newState: {
      step: "choosing_doctor",
      doctors: doctors.map((d) => ({ id: d.id, name: d.name, priceCents: d.priceCents, specialty: d.specialty })),
    },
  };
}

async function listMine(userId: string, uiEvents: UiEvent[]): Promise<LocalResult> {
  const appts = await myAppointments(userId);
  if (appts.length === 0) {
    return {
      text: "Você ainda não tem consultas por aqui. Que tal cuidar de você? Me conta o que está sentindo 💙",
      uiEvents,
      quickReplies: WELCOME_CHIPS.slice(0, 3),
      newState: { step: "awaiting_symptom" },
    };
  }
  const list = appts
    .map((a, i) => `*${i + 1} - ${a.doctor.user.name}* (${a.doctor.specialty.name})\n     ${fmtSlot(a.startsAt.toISOString())} · ${statusLabel(a.status)}`)
    .join("\n");
  return {
    text: `Suas consultas:\n${list}`,
    uiEvents,
    quickReplies: ["Cancelar consulta", "Marcar nova consulta"],
    newState: {},
  };
}

async function startCancel(userId: string, uiEvents: UiEvent[]): Promise<LocalResult> {
  const appts = (await myAppointments(userId)).filter((a) =>
    ["CONFIRMADA", "AGUARDANDO_PAGAMENTO"].includes(a.status),
  );
  if (appts.length === 0) {
    return { text: "Você não tem consultas ativas para cancelar.", uiEvents, quickReplies: [], newState: {} };
  }
  if (appts.length === 1) {
    return {
      text:
        `Cancelar *${appts[0].doctor.user.name}* em ${fmtSlot(appts[0].startsAt.toISOString())}?\n` +
        `Se já estiver paga, o estorno integral sai em até 5 dias úteis. (1 - Sim · 2 - Não)`,
      uiEvents,
      quickReplies: ["1 — Sim, cancelar", "2 — Não"],
      newState: { step: "confirm_cancel", cancelChosenId: appts[0].id },
    };
  }
  const list = appts
    .map((a, i) => `${i + 1} - ${a.doctor.user.name} · ${fmtSlot(a.startsAt.toISOString())}`)
    .join("\n");
  return {
    text: `Qual consulta você quer cancelar?\n${list}`,
    uiEvents,
    quickReplies: appts.map((_, i) => String(i + 1)),
    newState: { step: "choosing_cancel", cancelIds: appts.map((a) => a.id) },
  };
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    CONFIRMADA: "✅ confirmada",
    AGUARDANDO_PAGAMENTO: "⏱ aguardando pagamento",
    CONCLUIDA: "✔ concluída",
  };
  return map[status] ?? status.toLowerCase();
}
