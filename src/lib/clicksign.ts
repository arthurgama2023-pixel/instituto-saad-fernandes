// Cliente da API v3 do Clicksign — assinatura digital ICP-Brasil real.
// O Clicksign não emite certificado pra ninguém: ele só exige e valida o
// certificado ICP-Brasil (A1/A3) que o signatário já possui, no momento em
// que ele abre o link de assinatura. Por isso o fluxo é assíncrono.
//
// Docs: https://developers.clicksign.com (auth via ?access_token= na v3,
// não Bearer — confirmado testando contra a API real).

const BASE_URL = process.env.CLICKSIGN_API_BASE_URL ?? "https://sandbox.clicksign.com";
const TOKEN = process.env.CLICKSIGN_API_TOKEN;

type JsonApiDoc = { data: { id: string; type: string; attributes?: Record<string, unknown> } };

async function clicksignFetch(path: string, init?: RequestInit): Promise<JsonApiDoc> {
  if (!TOKEN) throw new Error("CLICKSIGN_API_TOKEN não configurado.");

  const url = new URL(BASE_URL + path);
  url.searchParams.set("access_token", TOKEN);

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.errors?.[0]?.detail ?? `HTTP ${res.status}`;
    throw new Error(`Clicksign: ${detail}`);
  }
  return body;
}

export async function criarEnvelope(nome: string): Promise<string> {
  const r = await clicksignFetch("/api/v3/envelopes", {
    method: "POST",
    body: JSON.stringify({
      data: { type: "envelopes", attributes: { name: nome, locale: "pt-BR", auto_close: true } },
    }),
  });
  return r.data.id;
}

export async function enviarDocumento(envelopeId: string, filename: string, conteudoBase64: string): Promise<string> {
  // O campo exige um data URI, não base64 puro.
  const dataUri = `data:application/pdf;base64,${conteudoBase64}`;
  const r = await clicksignFetch(`/api/v3/envelopes/${envelopeId}/documents`, {
    method: "POST",
    body: JSON.stringify({
      data: { type: "documents", attributes: { filename, content_base64: dataUri } },
    }),
  });
  return r.data.id;
}

// Sem e-mail cadastrado pro médico (só telefone) — a notificação vai por
// WhatsApp, que já é o canal principal do app pra falar com o médico (OTP).
//
// GAP CONHECIDO: exigir auth "icp_brasil" exige has_documentation=true (CPF),
// porque o Clicksign confere o certificado contra o CPF do titular — e o
// cadastro do médico hoje não coleta CPF, só CRM. Até esse campo existir,
// usamos um CPF de teste (dígito verificador válido, sem pertencer a
// ninguém — padrão usado em ambientes de homologação) só pra provar o resto
// do fluxo. Em produção isso PRECISA vir do cadastro real do médico.
const CPF_TESTE_SANDBOX = "111.444.777-35";

export async function criarSignatario(
  envelopeId: string,
  { nome, telefoneE164 }: { nome: string; telefoneE164: string }
): Promise<string> {
  // Clicksign espera DDD+número sem o "55" do país (10 ou 11 dígitos).
  const phoneNumber = telefoneE164.startsWith("55") ? telefoneE164.slice(2) : telefoneE164;

  const r = await clicksignFetch(`/api/v3/envelopes/${envelopeId}/signers`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "signers",
        attributes: {
          name: nome,
          phone_number: phoneNumber,
          documentation: CPF_TESTE_SANDBOX,
          has_documentation: true,
          communicate_events: { signature_request: "whatsapp", signature_reminder: "none", document_signed: "whatsapp" },
        },
      },
    }),
  });
  return r.data.id;
}

async function criarRequisito(
  envelopeId: string,
  documentId: string,
  signerId: string,
  attributes: Record<string, string>
): Promise<void> {
  await clicksignFetch(`/api/v3/envelopes/${envelopeId}/requirements`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "requirements",
        attributes,
        relationships: {
          document: { data: { type: "documents", id: documentId } },
          signer: { data: { type: "signers", id: signerId } },
        },
      },
    }),
  });
}

// Dois requisitos: (1) que este signatário precisa assinar o documento, e
// (2) que a evidência exigida pra essa assinatura é um certificado digital
// ICP-Brasil — não basta clicar "concordo".
export async function exigirAssinaturaIcp(envelopeId: string, documentId: string, signerId: string): Promise<void> {
  await criarRequisito(envelopeId, documentId, signerId, { action: "agree", role: "sign" });
  await criarRequisito(envelopeId, documentId, signerId, { action: "provide_evidence", auth: "icp_brasil" });
}

// Ativa o envelope (draft -> running): a partir daqui o Clicksign notifica o
// signatário e o processo de assinatura começa de verdade.
export async function ativarEnvelope(envelopeId: string): Promise<void> {
  await clicksignFetch(`/api/v3/envelopes/${envelopeId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: { id: envelopeId, type: "envelopes", attributes: { status: "running" } },
    }),
  });
}
