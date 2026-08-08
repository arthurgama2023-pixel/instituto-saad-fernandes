import { NextResponse } from "next/server";
import { getPatientUser } from "@/lib/session";
import { listarDocumentosPaciente } from "@/modules/documents/service";

/** Lista os documentos do paciente da sessão atual. */
export async function GET() {
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const docs = await listarDocumentosPaciente(user.id);
  return NextResponse.json({
    documentos: docs.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      titulo: d.titulo,
      temTexto: d.conteudo.length > 0,
      arquivoNome: d.arquivoNome,
      assinado: d.assinado,
      medico: d.doctor.user.name,
      emitidoEm: d.emitidoEm.toISOString(),
      novo: d.lidoEm === null,
    })),
  });
}
