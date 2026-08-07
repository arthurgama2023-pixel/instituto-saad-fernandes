import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";
import { listarDocumentosPaciente } from "@/modules/documents/service";
import { runAsUser } from "@/lib/db";

/** Lista os documentos do paciente da sessão atual. */
export async function GET() {
  const user = await getDemoUser();
  const docs = await runAsUser(user.id, () => listarDocumentosPaciente(user.id));
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
