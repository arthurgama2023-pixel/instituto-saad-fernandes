import { NextResponse } from "next/server";
import { getPatientUser } from "@/lib/session";
import { ensureSeeded } from "@/modules/catalog/seed";
import { ensurePatientDemo } from "@/modules/demo/seed-demo";
import { listSpecialties } from "@/modules/catalog/service";
import { myAppointments } from "@/modules/scheduling/service";
import { db } from "@/lib/db";

export async function GET() {
  await ensureSeeded();
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  await ensurePatientDemo(user.id);

  const appts = await myAppointments(user.id);
  const now = Date.now();

  const upcoming = appts
    .filter((a) => ["CONFIRMADA", "AGUARDANDO_PAGAMENTO"].includes(a.status) && a.startsAt.getTime() >= now - 3600000)
    .map(serialize);

  // passadas / concluídas
  const past = (
    await db.appointment.findMany({
      where: { patientId: user.id, status: "CONCLUIDA" },
      include: { doctor: { include: { user: true, specialty: true } }, payment: true },
      orderBy: { startsAt: "desc" },
      take: 10,
    })
  ).map(serialize);

  const specialties = await listSpecialties();

  return NextResponse.json({
    name: user.name,
    phone: user.phone,
    next: upcoming[0] ?? null,
    upcoming,
    past,
    specialties: specialties.map((s) => ({ slug: s.slug, name: s.name, icon: s.icon })),
    condicoesCronicas: user.condicoesCronicas ?? "",
    alergias: user.alergias ?? "",
    healthSummary:
      past.length > 0
        ? `${past.length + upcoming.length} consulta(s) no seu histórico. ${
            upcoming[0] ? `Próxima: ${upcoming[0].especialidade} com ${upcoming[0].medico}.` : "Nenhuma consulta agendada — que tal cuidar de você?"
          }`
        : "Seu histórico de saúde aparece aqui conforme você se consulta. Fale com a Clara para começar.",
  });
}

function serialize(a: {
  id: string;
  startsAt: Date;
  status: string;
  priceCents: number;
  mode: string;
  durationMin: number;
  resumoClinico: string | null;
  condutas: string | null;
  doctor: { crm: string; bio: string; user: { name: string }; specialty: { slug: string; name: string; icon: string } };
}) {
  return {
    id: a.id,
    medico: a.doctor.user.name,
    medicoCrm: a.doctor.crm,
    medicoBio: a.doctor.bio,
    especialidade: a.doctor.specialty.name,
    especialidadeSlug: a.doctor.specialty.slug,
    icon: a.doctor.specialty.icon,
    startsAt: a.startsAt.toISOString(),
    durationMin: a.durationMin,
    status: a.status,
    mode: a.mode,
    priceCents: a.priceCents,
    resumoClinico: a.resumoClinico,
    condutas: a.condutas,
  };
}
