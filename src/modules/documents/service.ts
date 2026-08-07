import { db } from "@/lib/db";

export const TIPOS = ["RECEITA", "ATESTADO", "EXAME", "OUTRO"] as const;
export type TipoDocumento = (typeof TIPOS)[number];

export const TIPO_LABEL: Record<string, string> = {
  RECEITA: "Receita",
  ATESTADO: "Atestado",
  EXAME: "Exame",
  OUTRO: "Documento",
};

export type NovoDocumento = {
  tipo: TipoDocumento;
  titulo: string;
  conteudo: string;
  doctorId: string;
  patientId: string;
  appointmentId?: string | null;
  arquivo?: Uint8Array<ArrayBuffer> | null;
  arquivoNome?: string | null;
  arquivoMime?: string | null;
};

/** Cria um documento. Valida que o médico e o paciente existem. */
export async function criarDocumento(d: NovoDocumento) {
  const doctor = await db.doctor.findUnique({ where: { id: d.doctorId } });
  const patient = await db.user.findUnique({ where: { id: d.patientId } });
  if (!doctor || !patient) return null;

  return db.documento.create({
    data: {
      tipo: d.tipo,
      titulo: d.titulo,
      conteudo: d.conteudo,
      doctorId: d.doctorId,
      patientId: d.patientId,
      appointmentId: d.appointmentId ?? null,
      arquivo: d.arquivo ?? null,
      arquivoNome: d.arquivoNome ?? null,
      arquivoMime: d.arquivoMime ?? null,
    },
  });
}

/** Metadados dos documentos de um paciente (sem os bytes do arquivo). */
export async function listarDocumentosPaciente(patientId: string) {
  return db.documento.findMany({
    where: { patientId },
    orderBy: { emitidoEm: "desc" },
    select: {
      id: true,
      tipo: true,
      titulo: true,
      conteudo: true,
      arquivoNome: true,
      arquivoMime: true,
      emitidoEm: true,
      lidoEm: true,
      doctor: { include: { user: true } },
    },
  });
}

/** Documentos que um médico enviou a um paciente (para a tela do médico). */
export async function listarDocumentosMedicoPaciente(doctorId: string, patientId: string) {
  return db.documento.findMany({
    where: { doctorId, patientId },
    orderBy: { emitidoEm: "desc" },
    select: {
      id: true,
      tipo: true,
      titulo: true,
      arquivoNome: true,
      emitidoEm: true,
      lidoEm: true,
    },
  });
}

/** Documento completo para exibição (inclui médico/paciente, sem os bytes). */
export async function getDocumento(id: string) {
  return db.documento.findUnique({
    where: { id },
    select: {
      id: true,
      tipo: true,
      titulo: true,
      conteudo: true,
      arquivoNome: true,
      arquivoMime: true,
      emitidoEm: true,
      patientId: true,
      doctorId: true,
      patient: { select: { name: true } },
      doctor: { include: { user: true, specialty: true } },
    },
  });
}

/** Só os bytes do arquivo, para download/stream. */
export async function getArquivo(id: string) {
  return db.documento.findUnique({
    where: { id },
    select: { arquivo: true, arquivoNome: true, arquivoMime: true, patientId: true, doctorId: true },
  });
}

/** Marca como lido (some o selo "novo") quando o paciente abre. */
export async function marcarLido(id: string, patientId: string) {
  await db.documento.updateMany({
    where: { id, patientId, lidoEm: null },
    data: { lidoEm: new Date() },
  });
}
