import { db } from "@/lib/db";
import { getNextSlots } from "@/modules/scheduling/service";

export type DoctorCard = {
  id: string;
  name: string;
  specialty: string;
  specialtyIcon: string;
  crm: string;
  bio: string;
  yearsExp: number;
  rating: number;
  priceCents: number;
  durationMin: number;
  mode: string;
  nextSlots: string[]; // ISO
};

export async function listSpecialties() {
  return db.specialty.findMany({ orderBy: { name: "asc" } });
}

/** Encontra especialidade por slug OU por keyword contida no texto do sintoma. */
export async function matchSpecialty(text: string) {
  const specialties = await listSpecialties();
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  for (const s of specialties) {
    if (norm.includes(s.slug) || norm.includes(s.name.toLowerCase())) return s;
    const keywords: string[] = JSON.parse(s.keywords);
    if (keywords.some((k) => norm.includes(k))) return s;
  }
  return null;
}

export async function searchDoctors(opts: {
  specialtySlug?: string;
  priceMaxCents?: number;
  limit?: number;
}): Promise<DoctorCard[]> {
  const doctors = await db.doctor.findMany({
    where: {
      status: "ACTIVE",
      ...(opts.specialtySlug ? { specialty: { slug: opts.specialtySlug } } : {}),
      ...(opts.priceMaxCents ? { priceCents: { lte: opts.priceMaxCents } } : {}),
    },
    include: { user: true, specialty: true },
    orderBy: { rating: "desc" },
    take: opts.limit ?? 3,
  });

  const cards: DoctorCard[] = [];
  for (const d of doctors) {
    cards.push({
      id: d.id,
      name: d.user.name,
      specialty: d.specialty.name,
      specialtyIcon: d.specialty.icon,
      crm: d.crm,
      bio: d.bio,
      yearsExp: d.yearsExp,
      rating: d.rating,
      priceCents: d.priceCents,
      durationMin: d.durationMin,
      mode: d.mode,
      nextSlots: await getNextSlots(d.id, 3),
    });
  }
  // Quem tem horário mais cedo aparece primeiro (o dado que converte — Etapa 2 §3.1)
  cards.sort((a, b) => (a.nextSlots[0] ?? "9999").localeCompare(b.nextSlots[0] ?? "9999"));
  return cards;
}

export async function getDoctorCard(doctorId: string): Promise<DoctorCard | null> {
  const d = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true, specialty: true },
  });
  if (!d) return null;
  return {
    id: d.id,
    name: d.user.name,
    specialty: d.specialty.name,
    specialtyIcon: d.specialty.icon,
    crm: d.crm,
    bio: d.bio,
    yearsExp: d.yearsExp,
    rating: d.rating,
    priceCents: d.priceCents,
    durationMin: d.durationMin,
    mode: d.mode,
    nextSlots: await getNextSlots(d.id, 6),
  };
}
