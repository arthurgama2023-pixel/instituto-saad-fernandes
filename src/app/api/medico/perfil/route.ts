import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthedDoctorId } from "@/lib/doctor-session";
import { normalizePhone } from "@/modules/auth/otp";

const NAO_AUTENTICADO = { error: "Entre como médico para editar seu perfil.", naoAutenticado: true };

function parseCrm(crm: string): { crmNumero: string; uf: string } {
  const m = crm.match(/^CRM\s+(.+)-([A-Za-z]{2})$/);
  return m ? { crmNumero: m[1], uf: m[2].toUpperCase() } : { crmNumero: crm, uf: "" };
}

/** Perfil do MÉDICO AUTENTICADO (nunca de um doctorId vindo do cliente). */
export async function GET() {
  const doctorId = await getAuthedDoctorId();
  if (!doctorId) return NextResponse.json(NAO_AUTENTICADO, { status: 401 });

  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true, specialty: true },
  });
  if (!doctor) return NextResponse.json({ error: "Médico não encontrado." }, { status: 404 });

  const especialidades = await db.specialty.findMany({ orderBy: { name: "asc" } });
  const { crmNumero, uf } = parseCrm(doctor.crm);

  return NextResponse.json({
    name: doctor.user.name,
    email: doctor.user.email ?? "",
    whatsapp: doctor.user.phone ?? "",
    crmNumero,
    uf,
    specialtyId: doctor.specialtyId,
    bio: doctor.bio,
    yearsExp: doctor.yearsExp,
    priceReais: doctor.priceCents / 100,
    durationMin: doctor.durationMin,
    mode: doctor.mode,
    rating: doctor.rating,
    status: doctor.status,
    especialidades: especialidades.map((s) => ({ id: s.id, name: s.name })),
  });
}

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(160).optional().default(""),
  whatsapp: z.string().trim().max(20).optional().default(""),
  crmNumero: z.string().trim().min(1).max(20),
  uf: z.string().trim().length(2),
  specialtyId: z.string().trim().min(1),
  bio: z.string().trim().max(600).optional().default(""),
  yearsExp: z.number().int().min(0).max(70),
  priceReais: z.number().min(0).max(100000),
  durationMin: z.number().int().min(10).max(180),
  mode: z.enum(["VIDEO", "IN_PERSON", "BOTH"]),
});

export async function PUT(req: NextRequest) {
  const doctorId = await getAuthedDoctorId();
  if (!doctorId) return NextResponse.json(NAO_AUTENTICADO, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os campos e tente de novo." }, { status: 400 });
  }
  const d = parsed.data;

  const doctor = await db.doctor.findUnique({ where: { id: doctorId }, select: { userId: true } });
  if (!doctor) return NextResponse.json({ error: "Médico não encontrado." }, { status: 404 });

  const specialty = await db.specialty.findUnique({ where: { id: d.specialtyId } });
  if (!specialty) return NextResponse.json({ error: "Especialidade inválida." }, { status: 400 });

  // email/phone são @unique — checa se já pertencem a outra conta antes de gravar.
  const emailNorm = d.email.trim().toLowerCase() || null;
  if (emailNorm) {
    const dono = await db.user.findUnique({ where: { email: emailNorm } });
    if (dono && dono.id !== doctor.userId) {
      return NextResponse.json({ error: "Esse e-mail já está em uso por outra conta." }, { status: 409 });
    }
  }
  const phoneNorm = d.whatsapp.trim() ? normalizePhone(d.whatsapp) : null;
  if (phoneNorm) {
    const dono = await db.user.findUnique({ where: { phone: phoneNorm } });
    if (dono && dono.id !== doctor.userId) {
      return NextResponse.json({ error: "Esse WhatsApp já está em uso por outra conta." }, { status: 409 });
    }
  }

  await db.user.update({
    where: { id: doctor.userId },
    data: { name: d.name.trim(), email: emailNorm, phone: phoneNorm },
  });

  const updated = await db.doctor.update({
    where: { id: doctorId },
    data: {
      crm: `CRM ${d.crmNumero.trim()}-${d.uf.toUpperCase()}`,
      specialtyId: d.specialtyId,
      bio: d.bio.trim() || "Sem apresentação informada.",
      yearsExp: d.yearsExp,
      priceCents: Math.round(d.priceReais * 100),
      durationMin: d.durationMin,
      mode: d.mode,
    },
    include: { user: true, specialty: true },
  });

  return NextResponse.json({
    ok: true,
    name: updated.user.name,
    crm: updated.crm,
    specialty: updated.specialty.name,
  });
}
