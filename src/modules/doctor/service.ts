import { db } from "@/lib/db";

const OCCUPYING = ["CONFIRMADA", "CONCLUIDA", "AGUARDANDO_PAGAMENTO"];

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function dayBounds(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
// Semana começando na segunda-feira (padrão BR). getDay(): 0=dom..6=sáb.
function weekBounds(base = new Date()) {
  const diaSemana = base.getDay();
  const desdeSegunda = (diaSemana + 6) % 7; // dom→6, seg→0, ter→1…
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - desdeSegunda);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export async function listDoctors() {
  const docs = await db.doctor.findMany({
    where: { status: "ACTIVE" },
    include: { user: true, specialty: true },
    orderBy: { rating: "desc" },
  });
  return docs.map((d) => ({ id: d.id, name: d.user.name, specialty: d.specialty.name }));
}

export async function getDefaultDoctorId(): Promise<string | null> {
  const d = await db.doctor.findFirst({ where: { status: "ACTIVE" }, orderBy: { rating: "desc" } });
  return d?.id ?? null;
}

export async function doctorPanel(doctorId: string) {
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true, specialty: true, availability: true },
  });
  if (!doctor) return null;

  const { start: todayStart, end: todayEnd } = dayBounds();

  const todayAppts = await db.appointment.findMany({
    where: { doctorId, startsAt: { gte: todayStart, lt: todayEnd }, status: { in: OCCUPYING } },
    include: { patient: true },
    orderBy: { startsAt: "asc" },
  });

  const consultasHoje = todayAppts.length;

  // Semana corrente (segunda 00:00 → segunda seguinte 00:00). Inclui CONCLUIDA
  // pra o médico ver o que já atendeu e o que falta na semana.
  const { start: weekStart, end: weekEnd } = weekBounds();
  const weekApptsRaw = await db.appointment.findMany({
    where: {
      doctorId,
      startsAt: { gte: weekStart, lt: weekEnd },
      status: { in: [...OCCUPYING, "CONCLUIDA"] },
    },
    include: { patient: true },
    orderBy: { startsAt: "asc" },
  });

  // faturamento líquido do mês (bruto − take)
  const monthPayments = await db.payment.findMany({
    where: {
      status: "CONFIRMED",
      createdAt: { gte: monthStart() },
      appointment: { doctorId },
    },
  });
  const faturamentoMesCents = monthPayments.reduce((s, p) => s + (p.amountCents - p.feeCents), 0);

  // ocupação de hoje: agendados / total de slots do dia
  const weekday = new Date().getDay();
  const rulesToday = doctor.availability.filter((r) => r.weekday === weekday);
  const rulesSlots = rulesToday.reduce(
    (s, r) => s + Math.floor((r.endMin - r.startMin) / doctor.durationMin),
    0,
  );
  // Sem regra hoje mas com consultas (demo): usa jornada-padrão de 8h como base.
  const totalSlots = rulesSlots > 0 ? rulesSlots : Math.floor((8 * 60) / doctor.durationMin);
  const ocupacao = consultasHoje > 0 || rulesSlots > 0 ? Math.round((consultasHoje / totalSlots) * 100) : null;

  // próximo paciente (mais cedo, hoje ou futuro, ainda não concluído)
  const now = new Date();
  const proximo = await db.appointment.findFirst({
    where: { doctorId, startsAt: { gte: now }, status: { in: ["CONFIRMADA", "AGUARDANDO_PAGAMENTO"] } },
    include: { patient: true },
    orderBy: { startsAt: "asc" },
  });
  const proximoPacienteVezes = proximo
    ? await db.appointment.count({ where: { doctorId, patientId: proximo.patientId, status: "CONCLUIDA" } })
    : 0;

  // pacientes distintos
  const allAppts = await db.appointment.findMany({
    where: { doctorId, status: { in: OCCUPYING } },
    include: { patient: true },
    orderBy: { startsAt: "desc" },
  });
  const patientMap = new Map<string, { id: string; name: string; last?: Date; total: number }>();
  for (const a of allAppts) {
    const cur = patientMap.get(a.patientId) ?? { id: a.patientId, name: a.patient.name, total: 0 };
    cur.total += 1;
    if (!cur.last || a.startsAt > cur.last) cur.last = a.startsAt;
    patientMap.set(a.patientId, cur);
  }

  // financeiro (consultas com pagamento)
  const payments = await db.payment.findMany({
    where: { appointment: { doctorId } },
    include: { appointment: { include: { patient: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    doctor: {
      id: doctor.id,
      name: doctor.user.name,
      specialty: doctor.specialty.name,
      specialtyIcon: doctor.specialty.icon,
      crm: doctor.crm,
      rating: doctor.rating,
      priceCents: doctor.priceCents,
    },
    kpis: {
      consultasHoje,
      faturamentoMesCents,
      rating: doctor.rating,
      ocupacao,
    },
    proximo: proximo
      ? {
          id: proximo.id,
          patient: proximo.patient.name,
          startsAt: proximo.startsAt.toISOString(),
          primeira: proximoPacienteVezes === 0,
        }
      : null,
    todayAppts: todayAppts.map((a) => ({
      id: a.id,
      patient: a.patient.name,
      startsAt: a.startsAt.toISOString(),
      status: a.status,
      priceCents: a.priceCents,
    })),
    week: {
      inicio: weekStart.toISOString(),
      fim: weekEnd.toISOString(),
      total: weekApptsRaw.length,
      concluidas: weekApptsRaw.filter((a) => a.status === "CONCLUIDA").length,
      aRealizar: weekApptsRaw.filter((a) => a.status !== "CONCLUIDA").length,
      // Query já traz só CONFIRMADA/AGUARDANDO_PAGAMENTO/CONCLUIDA — soma direta.
      faturamentoCents: weekApptsRaw.reduce((s, a) => s + a.priceCents, 0),
      appts: weekApptsRaw.map((a) => ({
        id: a.id,
        patient: a.patient.name,
        startsAt: a.startsAt.toISOString(),
        durationMin: a.durationMin,
        status: a.status,
        mode: a.mode,
        priceCents: a.priceCents,
      })),
    },
    patients: [...patientMap.values()]
      .sort((a, b) => (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0))
      .map((p) => ({ id: p.id, name: p.name, last: p.last?.toISOString() ?? null, total: p.total })),
    payments: payments.map((p) => ({
      id: p.id,
      patient: p.appointment.patient.name,
      date: p.createdAt.toISOString(),
      grossCents: p.amountCents,
      feeCents: p.feeCents,
      netCents: p.amountCents - p.feeCents,
      status: p.status,
    })),
  };
}
