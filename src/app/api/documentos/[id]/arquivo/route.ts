import { NextRequest, NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";
import { getArquivo } from "@/modules/documents/service";

/**
 * Baixa o arquivo anexado ao documento. Autoriza se o solicitante for o
 * paciente dono (sessão) ou o médico que emitiu (?d=<doctorId>).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getArquivo(id);
  if (!doc || !doc.arquivo) return NextResponse.json({ error: "arquivo não encontrado" }, { status: 404 });

  const comoMedico = req.nextUrl.searchParams.get("d");
  let autorizado = false;
  if (comoMedico && comoMedico === doc.doctorId) {
    autorizado = true;
  } else {
    const user = await getDemoUser();
    autorizado = user.id === doc.patientId;
  }
  if (!autorizado) return NextResponse.json({ error: "não autorizado" }, { status: 403 });

  const bytes = new Uint8Array(doc.arquivo);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": doc.arquivoMime ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.arquivoNome ?? "documento")}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
