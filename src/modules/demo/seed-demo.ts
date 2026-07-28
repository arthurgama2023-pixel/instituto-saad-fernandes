import { db } from "@/lib/db";
import { ensureSeeded } from "@/modules/catalog/seed";

// Dados de demonstração para os painéis (médico/admin) terem conteúdo vivo.
// Idempotente: só roda uma vez (detecta pelo paciente-marcador "João Almeida").

const TAKE_RATE_BPS = 1500;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function at(dayOffset: number, hh: number, mm: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
}

const DEMO_PATIENTS = [
  { name: "João Almeida", phone: "5521970001111" },
  { name: "Beatriz Nunes", phone: "5521970002222" },
  { name: "Carla Mendes", phone: "5521970003333" },
  { name: "Rafael Dias", phone: "5521970004444" },
  { name: "Sofia Ramos", phone: "5521970005555" },
];

// [médico(nome), paciente(nome), dayOffset, hh, mm, status]
const DEMO_APPTS: [string, string, number, number, number, string][] = [
  // Dr. Saad Fernandes (tricologia) — o "logado" no painel do médico
  ["Dr. Saad Fernandes", "João Almeida", 0, 9, 0, "CONCLUIDA"],
  ["Dr. Saad Fernandes", "Beatriz Nunes", 0, 9, 30, "CONCLUIDA"],
  ["Dr. Saad Fernandes", "Carla Mendes", 0, 14, 0, "CONFIRMADA"],
  ["Dr. Saad Fernandes", "Rafael Dias", 0, 16, 0, "CONFIRMADA"],
  ["Dr. Saad Fernandes", "Sofia Ramos", 1, 14, 0, "CONFIRMADA"],
  ["Dr. Saad Fernandes", "João Almeida", -2, 10, 0, "CONCLUIDA"],
  ["Dr. Saad Fernandes", "Sofia Ramos", -5, 15, 0, "CONCLUIDA"],
  ["Dr. Saad Fernandes", "Beatriz Nunes", -7, 9, 0, "NO_SHOW"],
  // Outros médicos
  ["Dra. Helena Prado", "Carla Mendes", 0, 8, 30, "CONFIRMADA"],
  ["Dra. Helena Prado", "Sofia Ramos", -1, 14, 0, "CONCLUIDA"],
  ["Dra. Helena Prado", "João Almeida", 1, 8, 30, "CONFIRMADA"],
  ["Dra. Paula Freitas", "Beatriz Nunes", -3, 9, 0, "CONCLUIDA"],
  ["Dra. Paula Freitas", "Rafael Dias", -1, 10, 0, "CONCLUIDA"],
  ["Dra. Paula Freitas", "Carla Mendes", 1, 9, 30, "CONFIRMADA"],
  ["Dr. Diego Santoro", "Rafael Dias", -1, 15, 0, "CONCLUIDA"],
];

// Médicos aguardando aprovação (fila do admin) — [nome, especialidade slug, crm]
const PENDING_DOCTORS: [string, string, string][] = [
  ["Dr. Henrique Salles", "tricologia", "CRM 567.890-SP"],
  ["Dra. Lívia Rocha", "dermatologia", "CRM 678.901-SP"],
];

let demoSeeded = false;

export async function ensureDemoData(): Promise<void> {
  if (demoSeeded) return;
  await ensureSeeded();

  const marker = await db.user.count({ where: { name: "João Almeida" } });
  if (marker > 0) {
    demoSeeded = true;
    return;
  }

  // pacientes
  const patients: Record<string, string> = {};
  for (const p of DEMO_PATIENTS) {
    const u = await db.user.create({ data: { name: p.name, phone: p.phone, role: "PATIENT" } });
    patients[p.name] = u.id;
  }

  // médicos existentes por nome
  const doctors = await db.doctor.findMany({ include: { user: true } });
  const doctorByName: Record<string, (typeof doctors)[number]> = {};
  for (const d of doctors) doctorByName[d.user.name] = d;

  // consultas + pagamentos
  for (const [docName, patName, off, hh, mm, status] of DEMO_APPTS) {
    const doc = doctorByName[docName];
    const patientId = patients[patName];
    if (!doc || !patientId) continue;
    const appt = await db.appointment.create({
      data: {
        patientId,
        doctorId: doc.id,
        startsAt: at(off, hh, mm),
        durationMin: doc.durationMin,
        mode: doc.mode,
        status,
        priceCents: doc.priceCents,
      },
    });
    if (status === "CONFIRMADA" || status === "CONCLUIDA" || status === "NO_SHOW") {
      await db.payment.create({
        data: {
          appointmentId: appt.id,
          amountCents: doc.priceCents,
          feeCents: Math.round((doc.priceCents * TAKE_RATE_BPS) / 10000),
          method: "PIX",
          status: status === "NO_SHOW" ? "CONFIRMED" : "CONFIRMED",
          pixCode: `demo-${appt.id.slice(-8)}`,
        },
      });
    }
  }

  // médicos pendentes de aprovação
  for (const [name, slug, crm] of PENDING_DOCTORS) {
    const specialty = await db.specialty.findUnique({ where: { slug } });
    if (!specialty) continue;
    const u = await db.user.create({ data: { name, role: "DOCTOR" } });
    await db.doctor.create({
      data: {
        userId: u.id,
        crm,
        bio: "Cadastro recém-enviado, aguardando validação de CRM e documentos.",
        yearsExp: 5,
        rating: 0,
        priceCents: 18000,
        specialtyId: specialty.id,
        status: "PENDING",
      },
    });
  }

  // conversas + mensagens: volume para o funil da Clara ficar realista
  // (muitas conversas → menos agendamentos → menos realizadas). ~48 conversas.
  const patientIds = Object.values(patients);
  for (let i = 0; i < 48; i++) {
    const patientId = patientIds[i % patientIds.length];
    const conv = await db.conversation.create({ data: { userId: patientId, channel: "whatsapp" } });
    const turns = 3 + Math.floor(Math.random() * 6);
    for (let j = 0; j < turns; j++) {
      await db.message.create({
        data: { conversationId: conv.id, role: j % 2 === 0 ? "user" : "clara", content: "(demo)" },
      });
    }
  }

  // eventos de urgência (contador do admin)
  const anyConv = await db.conversation.findFirst();
  if (anyConv) {
    await db.urgencyEvent.create({ data: { conversationId: anyConv.id, trigger: "dor no peito", level: 1 } });
    await db.urgencyEvent.create({ data: { conversationId: anyConv.id, trigger: "ideação suicida", level: 1 } });
  }

  demoSeeded = true;
  console.log("[seed-demo] painéis populados: 5 pacientes, 15 consultas, 2 médicos pendentes");
}

/** Garante que o paciente demo (cookie) tenha consultas para o app não ficar vazio. */
export async function ensurePatientDemo(userId: string): Promise<void> {
  const active = await db.appointment.count({
    where: { patientId: userId, status: { in: ["CONFIRMADA", "CONCLUIDA", "AGUARDANDO_PAGAMENTO"] } },
  });
  if (active > 0) return;

  const tricologista = await db.doctor.findFirst({
    where: { specialty: { slug: "tricologia" }, status: "ACTIVE" },
    orderBy: { rating: "desc" },
  });
  const dermato = await db.doctor.findFirst({
    where: { specialty: { slug: "dermatologia" }, status: "ACTIVE" },
  });
  if (!tricologista || !dermato) return;

  // próxima consulta confirmada
  const up = await db.appointment.create({
    data: {
      patientId: userId,
      doctorId: tricologista.id,
      startsAt: at(3, 9, 0),
      durationMin: tricologista.durationMin,
      mode: tricologista.mode,
      status: "CONFIRMADA",
      priceCents: tricologista.priceCents,
    },
  });
  await db.payment.create({
    data: {
      appointmentId: up.id,
      amountCents: tricologista.priceCents,
      feeCents: Math.round((tricologista.priceCents * TAKE_RATE_BPS) / 10000),
      pixCode: `demo-${up.id.slice(-8)}`,
      status: "CONFIRMED",
    },
  });
  // consulta passada concluída (histórico + receita)
  const past = await db.appointment.create({
    data: {
      patientId: userId,
      doctorId: dermato.id,
      startsAt: at(-9, 15, 0),
      durationMin: dermato.durationMin,
      mode: dermato.mode,
      status: "CONCLUIDA",
      priceCents: dermato.priceCents,
    },
  });
  await db.payment.create({
    data: {
      appointmentId: past.id,
      amountCents: dermato.priceCents,
      feeCents: Math.round((dermato.priceCents * TAKE_RATE_BPS) / 10000),
      pixCode: `demo-${past.id.slice(-8)}`,
      status: "CONFIRMED",
    },
  });
}
