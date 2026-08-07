import crypto from "node:crypto";

// Criptografia em repouso do certificado A1 e da senha de cada médico
// (AES-256-GCM). A chave vem de APP_ENCRYPTION_KEY (.env) — derivada por SHA-256
// para aceitar qualquer tamanho. Sem a chave, não dá pra guardar nem ler cert
// de médico (o fluxo cai no certificado do app).

function chave(): Buffer | null {
  const k = process.env.APP_ENCRYPTION_KEY;
  if (!k) return null;
  return crypto.createHash("sha256").update(k).digest(); // 32 bytes
}

export function criptografiaHabilitada(): boolean {
  return chave() !== null;
}

/** Cifra bytes → blob [iv(12) | tag(16) | ciphertext]. Null se sem chave. */
export function cifrar(dados: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const k = chave();
  if (!k) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(dados)), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, tag, enc]);
  // cópia num ArrayBuffer próprio (Buffer.concat pode ser view de um pool) —
  // evita gravar bytes errados no Prisma.
  const copia = new Uint8Array(out.byteLength);
  copia.set(out);
  return copia as Uint8Array<ArrayBuffer>;
}

/** Decifra o blob gerado por cifrar(). Null se sem chave ou blob inválido. */
export function decifrar(blob: Uint8Array): Buffer | null {
  const k = chave();
  if (!k) return null;
  try {
    const buf = Buffer.from(blob);
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]);
  } catch {
    return null;
  }
}

/** Conveniência: cifra/decifra strings (senha do .pfx). */
export function cifrarTexto(texto: string): string | null {
  const b = cifrar(Buffer.from(texto, "utf8"));
  return b ? Buffer.from(b).toString("base64") : null;
}
export function decifrarTexto(base64: string): string | null {
  const dec = decifrar(Buffer.from(base64, "base64"));
  return dec ? dec.toString("utf8") : null;
}
