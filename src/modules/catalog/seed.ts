import { db } from "@/lib/db";

// Seed idempotente do modo demo — verticais da clínica de demonstração:
// tricologia (carro-chefe), dermatologia e clínica geral.
// Chamado lazy na primeira request (zero fricção: npm run dev e pronto).

let seeded = false;

const SPECIALTIES = [
  {
    slug: "tricologia",
    name: "Tricologia",
    icon: "🧬",
    keywords: ["queda de cabelo", "cabelo caindo", "calvicie", "calvície", "alopecia", "careca", "entradas", "couro cabeludo", "caspa", "seborreia", "rarefação", "rarefacao", "fio fino", "implante capilar", "minoxidil"],
  },
  {
    slug: "dermatologia",
    name: "Dermatologia",
    icon: "✨",
    keywords: ["pele", "mancha", "acne", "espinha", "alergia na pele", "coceira", "unha", "melasma", "verruga", "pinta"],
  },
  {
    slug: "clinica-geral",
    name: "Clínica Geral",
    icon: "🩺",
    keywords: ["gripe", "febre", "checkup", "check-up", "dor de garganta", "cansaço", "exame de rotina", "mal estar", "pressao alta", "pressão alta"],
  },
];

// CPFs de dígito verificador válido, mas que não pertencem a ninguém — padrão
// usado em ambientes de teste/homologação. Só pra popular o demo e permitir
// exigir auth=icp_brasil no Clicksign sem travar por falta de CPF.
const DOCTORS = [
  { name: "Dr. Saad Fernandes", phone: "5511999990001", cpf: "111.444.777-35", specialty: "tricologia", crm: "CRM 123.456-SP", bio: "Tricologista e responsável técnico da equipe. Diagnóstico por tricoscopia digital e protocolos individualizados para alopecia.", yearsExp: 18, rating: 4.9, priceCents: 45000, rules: [[1, 540, 720], [3, 840, 1140], [5, 540, 720]] },
  { name: "Dra. Helena Prado", phone: "5511999990002", cpf: "529.982.247-25", specialty: "tricologia", crm: "CRM 234.567-SP", bio: "Especialista em alopecia feminina e eflúvio telógeno. Acompanhamento fotográfico da evolução.", yearsExp: 11, rating: 4.8, priceCents: 38000, rules: [[2, 480, 720], [4, 840, 1200]] },
  { name: "Dra. Paula Freitas", phone: "5511999990003", cpf: "168.995.350-09", specialty: "dermatologia", crm: "CRM 345.678-SP", bio: "Dermatologista clínica e estética. Avaliação de lesões, acne e rejuvenescimento.", yearsExp: 14, rating: 4.8, priceCents: 35000, rules: [[2, 540, 780], [4, 540, 780]] },
  { name: "Dr. Diego Santoro", phone: "5511999990004", cpf: "720.115.940-08", specialty: "clinica-geral", crm: "CRM 456.789-SP", bio: "Clínico geral. Primeira avaliação, check-up laboratorial e orientação de exames.", yearsExp: 9, rating: 4.7, priceCents: 28000, rules: [[1, 840, 1140], [2, 840, 1140], [3, 480, 720], [5, 840, 1140]] },
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
      data: { name: d.name, phone: d.phone, role: "DOCTOR" },
    });
    await db.doctor.create({
      data: {
        userId: user.id,
        crm: d.crm,
        cpf: d.cpf,
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
  console.log("[seed] modo demo populado: 3 especialidades, 4 médicos");
}
