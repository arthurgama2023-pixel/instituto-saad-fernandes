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
  // Dra. Camila Reis (psiquiatria) — a "logada" no painel do médico
  ["Dra. Camila Reis", "João Almeida", 0, 9, 0, "CONCLUIDA"],
  ["Dra. Camila Reis", "Beatriz Nunes", 0, 9, 30, "CONCLUIDA"],
  ["Dra. Camila Reis", "Carla Mendes", 0, 14, 0, "CONFIRMADA"],
  ["Dra. Camila Reis", "Rafael Dias", 0, 16, 0, "CONFIRMADA"],
  ["Dra. Camila Reis", "Sofia Ramos", 1, 14, 0, "CONFIRMADA"],
  ["Dra. Camila Reis", "João Almeida", -2, 10, 0, "CONCLUIDA"],
  ["Dra. Camila Reis", "Sofia Ramos", -5, 15, 0, "CONCLUIDA"],
  ["Dra. Camila Reis", "Beatriz Nunes", -7, 9, 0, "NO_SHOW"],
  // Outros médicos
  ["Dr. Rafael Monteiro", "Carla Mendes", 0, 8, 30, "CONFIRMADA"],
  ["Dr. Rafael Monteiro", "Sofia Ramos", -1, 14, 0, "CONCLUIDA"],
  ["Dra. Ana Lopes", "João Almeida", 1, 8, 30, "CONFIRMADA"],
  ["Dra. Ana Lopes", "Beatriz Nunes", -3, 9, 0, "CONCLUIDA"],
  ["Dra. Ana Lopes", "Rafael Dias", -1, 10, 0, "CONCLUIDA"],
  ["Dra. Paula Freitas", "Carla Mendes", 1, 9, 30, "CONFIRMADA"],
  ["Dr. Diego Santoro", "Rafael Dias", -1, 15, 0, "CONCLUIDA"],
];

// Médicos aguardando aprovação (fila do admin) — [nome, especialidade slug, crm]
const PENDING_DOCTORS: [string, string, string][] = [
  ["Dr. Henrique Salles", "psiquiatria", "CRM 52-78901"],
  ["Dra. Lívia Rocha", "dermatologia", "CRM 52-89012"],
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

  const ana = await db.doctor.findFirst({
    where: { specialty: { slug: "psicologia" }, status: "ACTIVE" },
  });
  const camila = await db.doctor.findFirst({
    where: { specialty: { slug: "psiquiatria" }, status: "ACTIVE" },
    orderBy: { rating: "desc" },
  });
  if (!ana || !camila) return;

  // próxima consulta confirmada
  const up = await db.appointment.create({
    data: {
      patientId: userId,
      doctorId: ana.id,
      startsAt: at(3, 9, 0),
      durationMin: ana.durationMin,
      mode: ana.mode,
      status: "CONFIRMADA",
      priceCents: ana.priceCents,
    },
  });
  await db.payment.create({
    data: {
      appointmentId: up.id,
      amountCents: ana.priceCents,
      feeCents: Math.round((ana.priceCents * TAKE_RATE_BPS) / 10000),
      pixCode: `demo-${up.id.slice(-8)}`,
      status: "CONFIRMED",
    },
  });
  // consulta passada concluída (histórico + receita)
  const past = await db.appointment.create({
    data: {
      patientId: userId,
      doctorId: camila.id,
      startsAt: at(-9, 15, 0),
      durationMin: camila.durationMin,
      mode: camila.mode,
      status: "CONCLUIDA",
      priceCents: camila.priceCents,
    },
  });
  await db.payment.create({
    data: {
      appointmentId: past.id,
      amountCents: camila.priceCents,
      feeCents: Math.round((camila.priceCents * TAKE_RATE_BPS) / 10000),
      pixCode: `demo-${past.id.slice(-8)}`,
      status: "CONFIRMED",
    },
  });
}
