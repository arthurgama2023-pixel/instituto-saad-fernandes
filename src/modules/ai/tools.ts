// Ferramentas da Clara (Etapa 5 §4) — as tools são a ÚNICA fonte de verdade.
// Cada executor chama os serviços de negócio (mesma autorização das rotas: sem porta dos fundos).

import { db } from "@/lib/db";
import { searchDoctors, getDoctorCard, listSpecialties } from "@/modules/catalog/service";
import {
  getNextSlots,
  holdSlot,
  cancelAppointment,
  myAppointments,
  getAppointment,
} from "@/modules/scheduling/service";
import { createCharge } from "@/modules/payments/service";
import { fmtMoney, fmtSlot } from "@/modules/shared/format";
import type { UiEvent } from "@/modules/conversation/service";
import { emergencyMessage } from "@/modules/ai/urgency";

export type ToolContext = {
  userId: string;
  userName: string;
  conversationId: string;
  uiEvents: UiEvent[];
};

type ToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  run: (ctx: ToolContext, input: Record<string, unknown>) => Promise<string>;
};

export const TOOLS: ToolDef[] = [
  {
    name: "buscar_medicos",
    description:
      "Busca médicos ativos por especialidade, com avaliação, preço e próximos horários livres. Chame quando o paciente descrever a necessidade ou pedir um especialista. Especialidades: tricologia, dermatologia, clinica-geral.",
    input_schema: {
      type: "object",
      properties: {
        especialidade: { type: "string", description: "slug da especialidade, ex.: tricologia" },
        preco_max_reais: { type: "number", description: "filtro opcional de preço máximo em reais" },
      },
      required: ["especialidade"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      const doctors = await searchDoctors({
        specialtySlug: String(input.especialidade),
        priceMaxCents: input.preco_max_reais ? Number(input.preco_max_reais) * 100 : undefined,
      });
      if (doctors.length === 0) {
        const specs = await listSpecialties();
        return JSON.stringify({
          resultado: "nenhum médico encontrado",
          especialidades_disponiveis: specs.map((s) => s.slug),
        });
      }
      ctx.uiEvents.push({ type: "doctors", items: doctors });
      return JSON.stringify(
        doctors.map((d) => ({
          medico_id: d.id,
          nome: d.name,
          especialidade: d.specialty,
          avaliacao: d.rating,
          anos_experiencia: d.yearsExp,
          preco: fmtMoney(d.priceCents),
          duracao_min: d.durationMin,
          proximos_horarios: d.nextSlots.map((s) => ({ iso: s, legivel: fmtSlot(s) })),
        })),
      );
    },
  },
  {
    name: "ver_agenda_medico",
    description: "Lista os próximos horários livres de um médico específico (use o medico_id retornado por buscar_medicos).",
    input_schema: {
      type: "object",
      properties: {
        medico_id: { type: "string" },
        quantidade: { type: "integer", description: "quantos horários retornar (padrão 6)" },
      },
      required: ["medico_id"],
      additionalProperties: false,
    },
    run: async (_ctx, input) => {
      const slots = await getNextSlots(String(input.medico_id), Number(input.quantidade ?? 6));
      return JSON.stringify(slots.map((s) => ({ iso: s, legivel: fmtSlot(s) })));
    },
  },
  {
    name: "reservar_slot",
    description:
      "Reserva um horário por 15 minutos para o paciente (mutação — só chame APÓS o paciente confirmar médico e horário explicitamente). Em seguida chame criar_cobranca.",
    input_schema: {
      type: "object",
      properties: {
        medico_id: { type: "string" },
        inicio_iso: { type: "string", description: "horário ISO exato retornado pelas buscas" },
      },
      required: ["medico_id", "inicio_iso"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      const res = await holdSlot(ctx.userId, String(input.medico_id), String(input.inicio_iso));
      if (!res.ok) return JSON.stringify({ erro: res.error });
      return JSON.stringify({
        reservado: true,
        appointment_id: res.appointmentId,
        valido_ate: res.holdUntil,
        valor: fmtMoney(res.priceCents),
      });
    },
  },
  {
    name: "criar_cobranca",
    description: "Gera a cobrança PIX de uma reserva feita com reservar_slot. O código PIX aparece num cartão na interface.",
    input_schema: {
      type: "object",
      properties: { appointment_id: { type: "string" } },
      required: ["appointment_id"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      const payment = await createCharge(String(input.appointment_id));
      if (!payment) return JSON.stringify({ erro: "reserva_invalida_ou_expirada" });
      ctx.uiEvents.push({
        type: "payment",
        payment: {
          id: payment.id,
          pixCode: payment.pixCode,
          amountCents: payment.amountCents,
          status: payment.status,
        },
      });
      return JSON.stringify({
        cobranca_criada: true,
        valor: fmtMoney(payment.amountCents),
        instrucao: "código PIX exibido no cartão da interface; pagamento confirma a consulta automaticamente",
      });
    },
  },
  {
    name: "minhas_consultas",
    description: "Lista as consultas do paciente (confirmadas, aguardando pagamento e concluídas).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    run: async (ctx) => {
      const appts = await myAppointments(ctx.userId);
      if (appts.length === 0) return JSON.stringify({ consultas: [] });
      return JSON.stringify(
        appts.map((a) => ({
          appointment_id: a.id,
          medico: a.doctor.user.name,
          especialidade: a.doctor.specialty.name,
          quando: fmtSlot(a.startsAt.toISOString()),
          status: a.status,
          valor: fmtMoney(a.priceCents),
        })),
      );
    },
  },
  {
    name: "cancelar_consulta",
    description:
      "Cancela uma consulta do paciente (mutação — só chame APÓS confirmação explícita, informando antes a consequência: reembolso se paga).",
    input_schema: {
      type: "object",
      properties: { appointment_id: { type: "string" } },
      required: ["appointment_id"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      const res = await cancelAppointment(String(input.appointment_id), ctx.userId);
      if (!res.ok) return JSON.stringify({ erro: "consulta_nao_encontrada" });
      return JSON.stringify({
        cancelada: true,
        reembolso: res.refunded ? "estorno integral em até 5 dias úteis" : "não havia pagamento",
      });
    },
  },
  {
    name: "sinalizar_urgencia",
    description:
      "URGÊNCIA: chame IMEDIATAMENTE se o relato sugerir risco à vida (dor no peito, falta de ar, sinais de AVC, ideação suicida, sangramento intenso, reação alérgica grave, sintoma grave em bebê). Interrompe qualquer fluxo, inclusive pagamento.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string" },
        categoria: {
          type: "string",
          enum: ["cardio", "respiratorio", "avc", "saude_mental", "hemorragia", "anafilaxia", "pediatria", "outro"],
        },
      },
      required: ["motivo", "categoria"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      await db.urgencyEvent.create({
        data: { conversationId: ctx.conversationId, trigger: String(input.motivo), level: 2 },
      });
      ctx.uiEvents.push({ type: "emergency" });
      const msg = emergencyMessage(ctx.userName, {
        trigger: String(input.motivo),
        category: String(input.categoria),
      });
      return JSON.stringify({ registrado: true, mensagem_padrao_de_emergencia: msg });
    },
  },
];

/** Detalhe de um appointment para o modelo confirmar dados após pagamento. */
export async function appointmentSummary(appointmentId: string) {
  const a = await getAppointment(appointmentId);
  if (!a) return null;
  return {
    appointment_id: a.id,
    medico: a.doctor.user.name,
    especialidade: a.doctor.specialty.name,
    quando: fmtSlot(a.startsAt.toISOString()),
    status: a.status,
    valor: fmtMoney(a.priceCents),
  };
}

export { getDoctorCard };
