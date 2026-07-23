import { db } from "@/lib/db";

// Seed idempotente do modo demo — vertical de lançamento: saúde mental (Etapa 8),
// mais 2 especialidades extras para demonstrar a triagem.
// Chamado lazy na primeira request (zero fricção: npm run dev e pronto).

let seeded = false;

const SPECIALTIES = [
  {
    slug: "psiquiatria",
    name: "Psiquiatria",
    icon: "🧠",
    keywords: ["ansiedade", "ansioso", "panico", "pânico", "depressao", "deprimido", "insonia", "não durmo", "nao durmo", "medicacao psiquiatrica", "bipolar", "tdah"],
  },
  {
    slug: "psicologia",
    name: "Psicologia",
    icon: "💬",
    keywords: ["terapia", "psicologo", "psicóloga", "tristeza", "luto", "estresse", "burnout", "relacionamento", "autoestima", "conversar com alguem"],
  },
  {
    slug: "dermatologia",
    name: "Dermatologia",
    icon: "✨",
    keywords: ["pele", "mancha", "acne", "espinha", "alergia na pele", "coceira", "queda de cabelo", "unha"],
  },
  {
    slug: "clinica-geral",
    name: "Clínica Geral",
    icon: "🩺",
    keywords: ["gripe", "febre", "checkup", "check-up", "dor de garganta", "cansaço", "exame de rotina", "mal estar"],
  },
];

const DOCTORS = [
  { name: "Dra. Camila Reis", specialty: "psiquiatria", crm: "CRM 52-12345", bio: "Psiquiatra com foco em ansiedade e transtornos do humor. Atendimento acolhedor e baseado em evidências.", yearsExp: 12, rating: 4.9, priceCents: 22000, rules: [[1, 540, 720], [3, 840, 1140], [5, 540, 720]] },
  { name: "Dr. Rafael Monteiro", specialty: "psiquiatria", crm: "CRM 52-23456", bio: "Especialista em TDAH e insônia. Ex-residente do IPUB/UFRJ.", yearsExp: 8, rating: 4.7, priceCents: 18000, rules: [[2, 480, 720], [4, 840, 1200]] },
  { name: "Dra. Ana Lopes", specialty: "psicologia", crm: "CRP 05-34567", bio: "Psicóloga clínica (TCC). Atende adultos e adolescentes em terapia semanal.", yearsExp: 10, rating: 4.9, priceCents: 15000, rules: [[1, 480, 720], [2, 480, 720], [4, 480, 720]] },
  { name: "Dr. Bruno Carvalho", specialty: "psicologia", crm: "CRP 05-45678", bio: "Psicólogo com foco em burnout e carreira. Abordagem ACT.", yearsExp: 6, rating: 4.6, priceCents: 12000, rules: [[3, 1020, 1320], [5, 480, 720]] },
  { name: "Dra. Paula Freitas", specialty: "dermatologia", crm: "CRM 52-56789", bio: "Dermatologista clínica e estética. Teledermatologia com laudo fotográfico.", yearsExp: 14, rating: 4.8, priceCents: 25000, rules: [[2, 540, 780], [4, 540, 780]] },
  { name: "Dr. Diego Santoro", specialty: "clinica-geral", crm: "CRM 52-67890", bio: "Clínico geral. Primeira avaliação, renovação de receitas e orientação de exames.", yearsExp: 9, rating: 4.7, priceCents: 14000, rules: [[1, 840, 1140], [2, 840, 1140], [3, 480, 720], [5, 840, 1140]] },
];

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const count = await db.specialty.count();
  if (count > 0) {
    seeded = true;
    return;
  }

  for (const s of SPECIALTIES) {
    await db.specialty.create({
      data: { slug: s.slug, name: s.name, icon: s.icon, keywords: JSON.stringify(s.keywords) },
    });
  }

  for (const d of DOCTORS) {
    const specialty = await db.specialty.findUniqueOrThrow({ where: { slug: d.specialty } });
    const user = await db.user.create({
      data: { name: d.name, role: "DOCTOR" },
    });
    await db.doctor.create({
      data: {
        userId: user.id,
        crm: d.crm,
        bio: d.bio,
        yearsExp: d.yearsExp,
        rating: d.rating,
        priceCents: d.priceCents,
        specialtyId: specialty.id,
        availability: {
          create: d.rules.map(([weekday, startMin, endMin]) => ({ weekday, startMin, endMin })),
        },
      },
    });
  }
  seeded = true;
  console.log("[seed] modo demo populado: 4 especialidades, 6 médicos");
}
