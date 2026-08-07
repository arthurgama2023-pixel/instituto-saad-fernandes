import Link from "next/link";
import { db } from "@/lib/db";
import { getDoctorSession } from "@/lib/doctor-session";
import { getDefaultDoctorId } from "@/modules/doctor/service";
import { Icon } from "@/components/brand/Icon";
import { ProntuarioEditor } from "./ProntuarioEditor";

const dateLabel = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const initials = (n: string) => n.replace(/^(dra?\.?)\s+/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export default async function ProntuarioPaciente({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { patientId } = await params;
  const sp = await searchParams;
  const doctorId = sp.d || (await getDoctorSession()) || (await getDefaultDoctorId()) || "";

  const patient = await db.user.findUnique({ where: { id: patientId } });
  const appts = await db.appointment.findMany({
    where: { doctorId, patientId },
    include: { doctor: { include: { specialty: true } } },
    orderBy: { startsAt: "desc" },
  });

  if (!patient || appts.length === 0) {
    return (
      <div className="brand-app min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-on-surface-variant">
        <p>Paciente não encontrado neste painel.</p>
        <Link href={`/medico?d=${doctorId}&tab=pacientes`} className="text-secondary font-semibold">
          ← Voltar para Pacientes
        </Link>
      </div>
    );
  }

  const registros = appts.map((a) => ({
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    startsAtLabel: dateLabel(a.startsAt),
    status: a.status,
    especialidade: a.doctor.specialty.name,
    resumoClinico: a.resumoClinico,
    condutas: a.condutas,
    prontuarioEmAt: a.prontuarioEmAt?.toISOString() ?? null,
    receituarioEspecial: a.receituarioEspecial,
    assinaturaIcpStatus: a.assinaturaIcpStatus,
    assinaturaIcpEm: a.assinaturaIcpEm?.toISOString() ?? null,
    assinaturaIcpTitular: a.assinaturaIcpTitular,
  }));

  return (
    <div className="brand-app min-h-screen bg-background text-on-background">
      <main className="max-w-[820px] mx-auto px-5 md:px-8 py-8">
        <Link
          href={`/medico?d=${doctorId}&tab=pacientes`}
          className="inline-flex items-center gap-1 text-body-sm font-body-sm text-secondary font-semibold mb-6"
        >
          <Icon name="arrow_back" size={16} /> Pacientes
        </Link>

        <section className="flex items-center gap-4 mb-8">
          <span className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-headline-sm font-headline-sm shrink-0">
            {initials(patient.name)}
          </span>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary">{patient.name}</h1>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Prontuário — {registros.length} consulta(s) com você
            </p>
          </div>
        </section>

        <div className="rounded-lg border border-secondary-fixed/40 bg-secondary-container/30 p-4 mb-6 text-body-sm font-body-sm text-on-secondary-container flex items-start gap-2">
          <Icon name="info" size={18} className="shrink-0 mt-0.5" />
          Versão amostra do prontuário eletrônico: texto livre, sem obrigatoriedade e sem certificação
          SBIS/CFM — não substitui o registro oficial exigido pelo CFM. O que você escrever aqui aparece
          para o paciente na tela da consulta.
        </div>

        <ProntuarioEditor doctorId={doctorId} registros={registros} />
      </main>
    </div>
  );
}
