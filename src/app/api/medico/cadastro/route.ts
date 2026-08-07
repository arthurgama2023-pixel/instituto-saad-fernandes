import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/modules/catalog/seed";
import { validarCertificado } from "@/modules/signing/icp";
import { cifrar, cifrarTexto, criptografiaHabilitada } from "@/modules/signing/cripto";
import { avisarMudancaMedicos } from "@/lib/realtime";

const MAX_CERT = 256 * 1024; // 256 KB (um A1 é pequeno)

/** Especialidades para o select do formulário. */
export async function GET() {
  await ensureSeeded();
  const especialidades = await db.specialty.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ especialidades: especialidades.map((s) => ({ slug: s.slug, name: s.name })) });
}

// Amostra: nenhum campo é obrigatório (pedido do dono). Só limites máximos
// (sanidade do banco) — sem mínimos, sem regra de formato. Tudo aceita vazio.
// O certificado (.pfx/senha) É opcional mesmo entre os opcionais: se vier
// arquivo sem senha (ou vice-versa) tratamos como "não enviou certificado".
const Body = z.object({
  nome: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  whatsapp: z.string().trim().max(20).optional().default(""),
  crmNumero: z.string().trim().max(20).optional().default(""),
  uf: z.string().trim().max(2).optional().default(""),
  especialidadeSlug: z.string().optional().default(""),
  anosExperiencia: z.number().int().min(0).max(70).optional().default(0),
  precoReais: z.number().min(0).max(100000).optional().default(0),
  modalidade: z.enum(["VIDEO", "IN_PERSON", "BOTH"]).optional().default("VIDEO"),
  bio: z.string().trim().max(600).optional().default(""),
});

/**
 * Cadastro público de médico. Cria o registro como PENDING — só entra em ACTIVE
 * depois da verificação/aprovação no painel admin. Nenhum médico atende antes disso.
 * Multipart: aceita opcionalmente o certificado A1 (.pfx + senha) já no cadastro,
 * pra assinar documentos desde o primeiro dia — sem precisar voltar depois em
 * Configurações. É seguro pedir aqui sem autenticação porque o certificado é
 * anexado ao Doctor recém-criado nesta mesma requisição, nunca a um já existente.
 */
export async function POST(req: NextRequest) {
  await ensureSeeded();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "envio inválido" }, { status: 400 });

  const raw = {
    nome: form.get("nome") ?? undefined,
    email: form.get("email") ?? undefined,
    whatsapp: form.get("whatsapp") ?? undefined,
    crmNumero: form.get("crmNumero") ?? undefined,
    uf: form.get("uf") ?? undefined,
    especialidadeSlug: form.get("especialidadeSlug") ?? undefined,
    anosExperiencia: form.has("anosExperiencia") ? Number(form.get("anosExperiencia")) : undefined,
    precoReais: form.has("precoReais") ? Number(form.get("precoReais")) : undefined,
    modalidade: form.get("modalidade") || undefined,
    bio: form.get("bio") ?? undefined,
  };
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os campos e tente de novo.", detalhes: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Certificado digital (opcional). Valida ANTES de criar qualquer registro,
  // pra não deixar médico pela metade se a senha/arquivo estiverem errados.
  const certFile = form.get("certArquivo");
  const certSenha = String(form.get("certSenha") ?? "");
  const temCertFile = certFile && typeof certFile === "object" && "arrayBuffer" in certFile && (certFile as File).size > 0;

  let certPfxCifrado: Uint8Array<ArrayBuffer> | null = null;
  let certSenhaCifrada: string | null = null;
  let certNome: string | null = null;

  if (temCertFile && certSenha) {
    if (!criptografiaHabilitada()) {
      return NextResponse.json(
        { error: "Certificado não pôde ser processado (servidor sem suporte a criptografia). Você pode cadastrá-lo depois em Configurações." },
        { status: 503 },
      );
    }
    const f = certFile as File;
    if (f.size > MAX_CERT) return NextResponse.json({ error: "Certificado (.pfx) acima de 256 KB." }, { status: 413 });

    const pfx = Buffer.from(await f.arrayBuffer());
    const ok = await validarCertificado(pfx, certSenha);
    if (!ok) {
      return NextResponse.json(
        { error: "Não consegui usar este certificado. Verifique a senha, ou deixe em branco e cadastre depois em Configurações." },
        { status: 422 },
      );
    }
    certPfxCifrado = cifrar(pfx);
    certSenhaCifrada = cifrarTexto(certSenha);
    certNome = f.name;
    if (!certPfxCifrado || !certSenhaCifrada) {
      return NextResponse.json({ error: "Falha ao proteger o certificado. Tente novamente." }, { status: 500 });
    }
  }

  // Especialidade vazia ou inválida: cai na primeira disponível, pra não
  // travar um cadastro de amostra por falta de seleção.
  const specialty =
    (d.especialidadeSlug && (await db.specialty.findUnique({ where: { slug: d.especialidadeSlug } }))) ||
    (await db.specialty.findFirst({ orderBy: { name: "asc" } }));
  if (!specialty) return NextResponse.json({ error: "Nenhuma especialidade cadastrada." }, { status: 500 });

  const nome = d.nome.trim() || "Médico(a) sem nome informado";
  const crmNumero = d.crmNumero.trim() || "—";
  const uf = (d.uf.trim() || "—").toUpperCase();
  const crm = `CRM ${crmNumero}-${uf}`;

  // E-mail é onde chegam as notificações de consulta. Guardamos só se preenchido
  // e ainda livre (é @unique) — vazio/duplicado vira null pra não travar o cadastro.
  const emailNorm = d.email.trim().toLowerCase() || null;
  const emailLivre = emailNorm && !(await db.user.findUnique({ where: { email: emailNorm } })) ? emailNorm : null;

  // Mesma proteção do e-mail: telefone é @unique no schema — duplicado vira
  // null em vez de derrubar o cadastro com um erro de banco.
  const phoneNorm = d.whatsapp.replace(/\D/g, "") || null;
  const phoneLivre = phoneNorm && !(await db.user.findUnique({ where: { phone: phoneNorm } })) ? phoneNorm : null;

  const user = await db.user.create({
    data: {
      name: nome,
      email: emailLivre,
      phone: phoneLivre,
      role: "DOCTOR",
    },
  });
  await db.doctor.create({
    data: {
      userId: user.id,
      crm,
      bio: d.bio.trim() || "Sem apresentação informada.",
      yearsExp: d.anosExperiencia,
      priceCents: Math.round(d.precoReais * 100),
      mode: d.modalidade,
      status: "PENDING",
      specialtyId: specialty.id,
      certPfx: certPfxCifrado,
      certSenha: certSenhaCifrada,
      certNome,
      certEm: certPfxCifrado ? new Date() : null,
    },
  });

  // Avisa a fila do admin em tempo real (Supabase Broadcast) — o painel aberto
  // atualiza sozinho e o novo médico aparece na fila de aprovação.
  await avisarMudancaMedicos();

  return NextResponse.json({ ok: true, nome, especialidade: specialty.name, certificadoAceito: Boolean(certPfxCifrado) });
}
