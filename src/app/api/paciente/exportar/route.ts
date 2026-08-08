import { NextResponse } from "next/server";
import { getPatientUser } from "@/lib/session";
import { db } from "@/lib/db";

/** Exporta os dados do paciente (LGPD — direito de portabilidade) como JSON. */
export async function GET() {
  const user = await getPatientUser();
  if (!user) return new Response("nao_autenticado", { status: 401 });

  const [appointments, documentos, addresses, paymentCards] = await Promise.all([
    db.appointment.findMany({
      where: { patientId: user.id },
      include: { doctor: { include: { user: true, specialty: true } } },
      orderBy: { startsAt: "desc" },
    }),
    db.documento.findMany({
      where: { patientId: user.id },
      select: { id: true, tipo: true, titulo: true, conteudo: true, emitidoEm: true },
    }),
    db.address.findMany({ where: { userId: user.id } }),
    db.paymentCard.findMany({
      where: { userId: user.id },
      select: { brand: true, last4: true, holder: true, expMonth: true, expYear: true },
    }),
  ]);

  const dump = {
    exportadoEm: new Date().toISOString(),
    conta: {
      nome: user.name,
      email: user.email,
      telefone: user.phone,
      criadaEm: user.createdAt,
    },
    saude: {
      condicoesCronicas: user.condicoesCronicas,
      alergias: user.alergias,
    },
    consultas: appointments.map((a) => ({
      data: a.startsAt,
      medico: a.doctor.user.name,
      especialidade: a.doctor.specialty.name,
      status: a.status,
      resumoClinico: a.resumoClinico,
      condutas: a.condutas,
    })),
    documentos,
    enderecos: addresses,
    cartoes: paymentCards,
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-smartdoctor.json"`,
    },
  });
}
