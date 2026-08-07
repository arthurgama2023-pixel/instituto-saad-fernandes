import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type DadosReceituario = {
  paciente: string;
  medico: string;
  medicoCrm: string;
  conteudo: string;
  data: Date;
};

const MARGEM = 60;
const LARGURA_PAGINA = 595.28; // A4 em pt
const LARGURA_UTIL = LARGURA_PAGINA - MARGEM * 2;

// Quebra de linha manual: pdf-lib não faz text wrap sozinho.
function quebrarLinhas(texto: string, tamanho: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(" ")) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (font.widthOfTextAtSize(tentativa, tamanho) > LARGURA_UTIL) {
        if (atual) linhas.push(atual);
        atual = palavra;
      } else {
        atual = tentativa;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

// PDF simples do receituário especial — só o conteúdo que vai pro Clicksign
// pra assinatura. Layout mínimo, sem timbrado: o documento que vale é o que
// sai assinado do Clicksign, não o design daqui.
export async function gerarReceituarioPdf(dados: DadosReceituario): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([LARGURA_PAGINA, 841.89]);
  const fonteRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 841.89 - MARGEM;

  page.drawText("Receituário especial", { x: MARGEM, y, size: 18, font: fonteNegrito, color: rgb(0, 0, 0) });
  y -= 36;

  page.drawText(`Paciente: ${dados.paciente}`, { x: MARGEM, y, size: 11, font: fonteRegular });
  y -= 16;
  page.drawText(`Data: ${dados.data.toLocaleDateString("pt-BR")}`, { x: MARGEM, y, size: 11, font: fonteRegular });
  y -= 28;

  page.drawText("Prescrição:", { x: MARGEM, y, size: 11, font: fonteNegrito });
  y -= 18;

  for (const linha of quebrarLinhas(dados.conteudo, 11, fonteRegular)) {
    page.drawText(linha, { x: MARGEM, y, size: 11, font: fonteRegular });
    y -= 15;
  }
  y -= 24;

  page.drawText(dados.medico, { x: MARGEM, y, size: 11, font: fonteRegular });
  y -= 15;
  page.drawText(dados.medicoCrm, { x: MARGEM, y, size: 11, font: fonteRegular });

  return pdf.save();
}

export function paraBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
