import crypto from "node:crypto";

// Hash de senha com scrypt (node:crypto) — sem dependência externa (o projeto
// não tem bcrypt/argon). Formato guardado: "scrypt$<salt-hex>$<hash-hex>".
// Usado no login por senha do médico (senha criada na ativação).

const N = 16384; // custo do scrypt (2^14) — equilíbrio segurança/latência
const KEYLEN = 64;

export function hashSenha(senha: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha, salt, KEYLEN, { N });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function conferirSenha(senha: string, guardado: string | null): boolean {
  if (!guardado) return false;
  const partes = guardado.split("$");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(partes[1], "hex");
    const esperado = Buffer.from(partes[2], "hex");
    const atual = crypto.scryptSync(senha, salt, esperado.length, { N });
    return crypto.timingSafeEqual(atual, esperado);
  } catch {
    return false;
  }
}
