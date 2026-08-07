import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { db } from "@/lib/db";
import { decifrar, decifrarTexto } from "./cripto";

// Assinatura digital PAdES (ICP-Brasil) de PDFs.
// Cada assinatura usa uma credencial { pfx, senha }, resolvida nesta ordem:
//   1) certificado A1 do próprio médico (guardado cifrado no banco);
//   2) certificado A1 do app (.env em base64) — fallback;
//   3) nenhum → o documento segue como PDF não assinado (no-op).

export type Credencial = { pfx: Buffer; senha: string };

/** Certificado do app (fallback), lido do .env. */
export function certificadoDoApp(): Credencial | null {
  const b64 = process.env.ICP_PFX_BASE64;
  const senha = process.env.ICP_PFX_PASSWORD;
  if (!b64 || !senha) return null;
  return { pfx: Buffer.from(b64, "base64"), senha };
}

/** Certificado do médico (decifrado do banco), se ele tiver cadastrado um. */
export async function certificadoDoMedico(doctorId: string): Promise<Credencial | null> {
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    select: { certPfx: true, certSenha: true },
  });
  if (!doctor?.certPfx || !doctor.certSenha) return null;
  const pfx = decifrar(doctor.certPfx);
  const senha = decifrarTexto(doctor.certSenha);
  if (!pfx || senha === null) return null; // sem APP_ENCRYPTION_KEY ou blob inválido
  return { pfx, senha };
}

/** Resolve a credencial de assinatura: médico primeiro, app como fallback. */
export async function resolverCredencial(doctorId: string): Promise<Credencial | null> {
  return (await certificadoDoMedico(doctorId)) ?? certificadoDoApp();
}

// Normaliza para Uint8Array<ArrayBuffer> (o tipo que o Prisma Bytes exige),
// copiando para um ArrayBuffer fresco.
function paraBytes(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(src.byteLength);
  const u8 = new Uint8Array(ab);
  u8.set(src);
  return u8;
}

// A fonte padrão (Helvetica/WinAnsi) não codifica \r nem caracteres de controle.
// Normaliza CRLF, remove controles (mantém \n) e troca o que estiver fora do
// imprimível ASCII + Latin-1 (acentos do PT-BR) por "?", pra nunca quebrar o desenho.
function sanitizar(texto: string): string {
  return (
    texto
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, "    ")
      // tipográficos comuns → equivalentes Latin-1 (evita virar "?")
      .replace(/[‘’‚]/g, "'")
      .replace(/[“”„]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...")
      // remove controles (mantém \n = \x0a)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "")
      // fora do imprimível ASCII (\x20-\x7e) + Latin-1 (\xa0-\xff) vira "?"
      .replace(/[^\n\x20-\x7e\xa0-\xff]/g, "?")
  );
}

/** Quebra um texto em linhas que cabem na largura, para desenhar no PDF. */
function quebrarLinhas(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(" ")) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(teste, tamanho) > largura && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

/** Gera um PDF A4 simples a partir do texto de um documento clínico. */
export async function pdfDeTexto(dados: {
  tipoLabel: string;
  titulo: string;
  conteudo: string;
  paciente: string;
  medico: string;
  crm: string;
  especialidade: string;
}): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const fonteBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margem = 50;
  const largura = 595 - margem * 2;
  let y = 792;

  const titulo = sanitizar(dados.titulo);
  const tipoLabel = sanitizar(dados.tipoLabel).toUpperCase();
  const verde = rgb(0.027, 0.518, 0.353);

  page.drawText("Smart Doctor", { x: margem, y, size: 18, font: fonteBold, color: verde });
  page.drawText(tipoLabel, {
    x: 595 - margem - fonte.widthOfTextAtSize(tipoLabel, 12),
    y: y + 4,
    size: 12,
    font: fonte,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;
  page.drawLine({ start: { x: margem, y }, end: { x: 595 - margem, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 30;

  page.drawText(titulo, { x: margem, y, size: 15, font: fonteBold, color: rgb(0.04, 0.08, 0.13) });
  y -= 30;

  for (const linha of quebrarLinhas(sanitizar(dados.conteudo), fonte, 11, largura)) {
    if (y < 140) break; // deixa espaço pro rodapé
    page.drawText(linha, { x: margem, y, size: 11, font: fonte, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
  }

  page.drawLine({ start: { x: margem, y: 120 }, end: { x: 595 - margem, y: 120 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  page.drawText(`Paciente: ${sanitizar(dados.paciente)}`, { x: margem, y: 100, size: 10, font: fonte, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(sanitizar(dados.medico), { x: margem, y: 78, size: 11, font: fonteBold, color: rgb(0.04, 0.08, 0.13) });
  page.drawText(`${sanitizar(dados.especialidade)} - ${sanitizar(dados.crm)}`, { x: margem, y: 64, size: 10, font: fonte, color: rgb(0.3, 0.3, 0.3) });

  return paraBytes(await doc.save());
}

/**
 * Assina um PDF (bytes) com a credencial informada. Retorna o PDF assinado, ou
 * null se não houver credencial (aí o chamador guarda o PDF sem assinatura).
 */
export async function assinarPdf(
  pdf: Uint8Array,
  signerNome: string,
  cred: Credencial | null,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!cred) return null;

  const doc = await PDFDocument.load(pdf);
  pdflibAddPlaceholder({
    pdfDoc: doc,
    reason: "Documento medico - Smart Doctor",
    contactInfo: "smartdoctor",
    name: sanitizar(signerNome),
    location: "Brasil",
    signatureLength: 8192, // folga pro certificado + cadeia
  });
  // useObjectStreams:false mantém o /ByteRange como string literal — senão o
  // pdf-lib comprime em object streams e o @signpdf não encontra ("No ByteRange").
  const comPlaceholder = Buffer.from(await doc.save({ useObjectStreams: false }));

  const signer = new P12Signer(cred.pfx, { passphrase: cred.senha });
  const assinado = await new SignPdf().sign(comPlaceholder, signer);
  return paraBytes(assinado);
}

/**
 * Verifica se um .pfx + senha conseguem assinar (valida senha e compatibilidade
 * do formato). Assina um PDF mínimo de teste. Retorna true se deu certo.
 */
export async function validarCertificado(pfx: Buffer, senha: string): Promise<boolean> {
  try {
    const doc = await PDFDocument.create();
    doc.addPage([200, 120]);
    const bytes = paraBytes(await doc.save());
    const assinado = await assinarPdf(bytes, "Teste", { pfx, senha });
    return assinado !== null;
  } catch {
    return false;
  }
}
