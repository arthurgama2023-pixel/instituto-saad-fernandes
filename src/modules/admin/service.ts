import { db } from "@/lib/db";

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function dayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function adminOverview() {
  const { start: todayStart, end: todayEnd } = dayBounds();

  // financeiro do mês
  const monthPayments = await db.payment.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: monthStart() } },
  });
  const gmvCents = monthPayments.reduce((s, p) => s + p.amountCents, 0);
  const receitaCents = monthPayments.reduce((s, p) => s + p.feeCents, 0);

  const consultasHoje = await db.appointment.count({
    where: { startsAt: { gte: todayStart, lt: todayEnd }, status: { in: ["CONFIRMADA", "CONCLUIDA"] } },
  });

  const novosPacientes = await db.user.count({
    where: { role: "PATIENT", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
  });

  // funil da Clara
  const mensagens = await db.message.count({ where: { role: "user" } });
  const conversas = await db.conversation.count();
  const agendamentos = await db.appointment.count({
    where: { status: { notIn: ["EXPIRADA"] } },
  });
  const realizadas = await db.appointment.count({
    where: { status: { in: ["CONFIRMADA", "CONCLUIDA"] } },
  });

  // fila de aprovação
  const pendentes = await db.doctor.findMany({
    where: { status: "PENDING" },
    include: { user: true, specialty: true },
    orderBy: { id: "asc" },
  });

  const urgencias = await db.urgencyEvent.count();
  const medicosAtivos = await db.doctor.count({ where: { status: "ACTIVE" } });
  const totalPacientes = await db.user.count({ where: { role: "PATIENT" } });

  // consultas por especialidade
  const appts = await db.appointment.findMany({
    where: { status: { in: ["CONFIRMADA", "CONCLUIDA"] } },
    include: { doctor: { include: { specialty: true } } },
  });
  const bySpec = new Map<string, { name: string; icon: string; count: number }>();
  for (const a of appts) {
    const s = a.doctor.specialty;
    const cur = bySpec.get(s.id) ?? { name: s.name, icon: s.icon, count: 0 };
    cur.count += 1;
    bySpec.set(s.id, cur);
  }

  return {
    kpis: { gmvCents, receitaCents, consultasHoje, novosPacientes, urgencias, medicosAtivos, totalPacientes },
    funil: { mensagens, conversas, agendamentos, realizadas },
    pendentes: pendentes.map((d) => ({
      id: d.id,
      name: d.user.name,
      specialty: d.specialty.name,
      crm: d.crm,
    })),
    especialidades: [...bySpec.values()].sort((a, b) => b.count - a.count),
  };
}

export async function listDoctorsAdmin() {
  const docs = await db.doctor.findMany({
    include: { user: true, specialty: true, _count: { select: { appointments: true } } },
    orderBy: [{ status: "asc" }, { rating: "desc" }],
  });
  return docs.map((d) => ({
    id: d.id,
    name: d.user.name,
    specialty: d.specialty.name,
    crm: d.crm,
    rating: d.rating,
    status: d.status,
    consultas: d._count.appointments,
    commissionBps: 1500,
  }));
}
