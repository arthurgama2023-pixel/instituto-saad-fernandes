import { NextRequest, NextResponse } from "next/server";
import {
  criarDocumento,
  listarDocumentosMedicoPaciente,
  TIPO_LABEL,
  TIPOS,
  type TipoDocumento,
} from "@/modules/documents/service";
import { notifyDocumento } from "@/modules/notifications/appointments";
import { assinarPdf, pdfDeTexto, resolverCredencial } from "@/modules/signing/icp";
import { db } from "@/lib/db";

const MAX_ARQUIVO = 5 * 1024 * 1024; // 5 MB

/** Lista os documentos que o médico enviou a um paciente. */
export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId") ?? "";
  const patientId = req.nextUrl.searchParams.get("patientId") ?? "";
  if (!doctorId || !patientId) return NextResponse.json({ error: "parâmetros ausentes" }, { status: 400 });
  const documentos = await listarDocumentosMedicoPaciente(doctorId, patientId);
  return NextResponse.json({
    documentos: documentos.map((d) => ({ ...d, emitidoEm: d.emitidoEm.toISOString(), lidoEm: d.lidoEm?.toISOString() ?? null })),
  });
}

/** Cria/envia um documento. Aceita multipart (com arquivo) ou campos de texto. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "envio inválido" }, { status: 400 });

  const tipo = String(form.get("tipo") ?? "");
  const titulo = String(form.get("titulo") ?? "").trim();
  const conteudo = String(form.get("conteudo") ?? "").trim();
  const doctorId = String(form.get("doctorId") ?? "");
  const patientId = String(form.get("patientId") ?? "");
  const appointmentId = (form.get("appointmentId") as string) || null;
  const file = form.get("arquivo");

  if (!TIPOS.includes(tipo as TipoDocumento)) return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  if (!doctorId || !patientId) return NextResponse.json({ error: "médico/paciente ausentes" }, { status: 400 });
  if (!titulo) return NextResponse.json({ error: "informe um título" }, { status: 400 });

  let arquivo: Uint8Array<ArrayBuffer> | null = null;
  let arquivoNome: string | null = null;
  let arquivoMime: string | null = null;
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    const f = file as File;
    if (f.size > 0) {
      if (f.size > MAX_ARQUIVO) return NextResponse.json({ error: "arquivo acima de 5 MB" }, { status: 413 });
      arquivo = new Uint8Array(await f.arrayBuffer());
      arquivoNome = f.name;
      arquivoMime = f.type || "application/octet-stream";
    }
  }

  if (!conteudo && !arquivo) {
    return NextResponse.json({ error: "escreva um texto ou anexe um arquivo" }, { status: 400 });
  }

  const doctor = await db.doctor.findUnique({ where: { id: doctorId }, include: { user: true, specialty: true } });
  const patient = await db.user.findUnique({ where: { id: patientId } });
  if (!doctor || !patient) return NextResponse.json({ error: "médico ou paciente não encontrado" }, { status: 404 });

  // Assinatura digital, quando faz sentido:
  //  - anexo já em PDF → assina o próprio PDF;
  //  - sem anexo, só texto → gera um PDF a partir do texto e assina;
  //  - anexo que NÃO é PDF (imagem) → mantém como está, sem assinatura
  //    (PAdES é só p/ PDF; e não descartamos a imagem do médico).
  // Qualquer falha aqui não impede o envio: guarda o documento sem assinatura.
  let assinado = false;
  let assinanteNome: string | null = null;
  let assinadoEm: Date | null = null;
  try {
    const anexoEhPdf =
      arquivo !== null && (arquivoMime === "application/pdf" || Boolean(arquivoNome?.toLowerCase().endsWith(".pdf")));

    let pdf: Uint8Array<ArrayBuffer> | null = null;
    if (anexoEhPdf) {
      pdf = arquivo;
    } else if (!arquivo && conteudo) {
      pdf = await pdfDeTexto({
        tipoLabel: TIPO_LABEL[tipo] ?? "Documento",
        titulo,
        conteudo,
        paciente: patient.name,
        medico: doctor.user.name,
        crm: doctor.crm,
        especialidade: doctor.specialty.name,
      });
    }

    if (pdf) {
      // credencial: certificado do próprio médico, senão o do app (fallback)
      const cred = await resolverCredencial(doctorId);
      const assinada = await assinarPdf(pdf, doctor.user.name, cred);
      if (assinada) {
        pdf = assinada;
        assinado = true;
        assinanteNome = doctor.user.name;
        assinadoEm = new Date();
      }
      arquivo = pdf; // o texto continua em `conteudo`; o PDF vai no anexo
      arquivoNome = anexoEhPdf && arquivoNome ? arquivoNome : `${tipo.toLowerCase()}-${Date.now()}.pdf`;
      arquivoMime = "application/pdf";
    }
  } catch (e) {
    console.error("[documentos] falha ao gerar/assinar PDF (segue sem assinatura):", e);
    assinado = false;
    assinanteNome = null;
    assinadoEm = null;
  }

  const doc = await criarDocumento({
    tipo: tipo as TipoDocumento,
    titulo,
    conteudo,
    doctorId,
    patientId,
    appointmentId,
    arquivo,
    arquivoNome,
    arquivoMime,
    assinado,
    assinanteNome,
    assinadoEm,
  });
  if (!doc) return NextResponse.json({ error: "médico ou paciente não encontrado" }, { status: 404 });

  await notifyDocumento(doc.id); // e-mail ao paciente (no-op se não tiver e-mail)

  return NextResponse.json({ ok: true, id: doc.id });
}
