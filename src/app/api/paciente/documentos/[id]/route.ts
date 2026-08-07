import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";
import { getDocumento, marcarLido, TIPO_LABEL } from "@/modules/documents/service";

/** Documento completo do paciente da sessão. Marca como lido ao abrir. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getDemoUser();
  const doc = await getDocumento(id);
  if (!doc || doc.patientId !== user.id) {
    return NextResponse.json({ error: "documento não encontrado" }, { status: 404 });
  }

  await marcarLido(id, user.id);

  return NextResponse.json({
    id: doc.id,
    tipo: doc.tipo,
    tipoLabel: TIPO_LABEL[doc.tipo] ?? "Documento",
    titulo: doc.titulo,
    conteudo: doc.conteudo,
    temArquivo: Boolean(doc.arquivoNome),
    arquivoNome: doc.arquivoNome,
    assinado: doc.assinado,
    assinanteNome: doc.assinanteNome,
    assinadoEm: doc.assinadoEm?.toISOString() ?? null,
    paciente: doc.patient.name,
    medico: doc.doctor.user.name,
    crm: doc.doctor.crm,
    especialidade: doc.doctor.specialty.name,
    emitidoEm: doc.emitidoEm.toISOString(),
  });
}
