import { db } from "@/lib/db";

const CODE_TTL_MS = 5 * 60 * 1000; // código vale 5 min
const MAX_PER_HOUR = 5; // trava anti-spam por telefone

/** Normaliza para dígitos e assume DDI 55 quando vem só com DDD+número. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 12) return digits; // já tem DDI
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function genCode(seed: number): string {
  // Sem Math.random no ambiente do workflow; aqui (runtime Node) é permitido,
  // mas mantemos determinístico-o-suficiente combinando tempo + contador.
  const n = (Math.floor(Math.random() * 900000) + 100000 + seed) % 1000000;
  return String(n).padStart(6, "0");
}

export type SendResult =
  | { ok: true; phone: string; devCode: string; nome: string }
  | { ok: false; error: "nao_cadastrado" | "muitas_tentativas" };

/**
 * Gera um código para o telefone de um médico cadastrado.
 * No MVP retorna o código (devCode) para ser mostrado na tela; com a API do
 * WhatsApp conectada, o envio da mensagem substitui essa exposição.
 */
export async function sendOtp(rawPhone: string): Promise<SendResult> {
  const phone = normalizePhone(rawPhone);

  const doctorUser = await db.user.findFirst({
    where: { phone, role: "DOCTOR" },
  });
  if (!doctorUser) return { ok: false, error: "nao_cadastrado" };

  const oneHourAgo = new Date(Date.now() - 3600_000);
  const recent = await db.otpCode.count({ where: { phone, createdAt: { gte: oneHourAgo } } });
  if (recent >= MAX_PER_HOUR) return { ok: false, error: "muitas_tentativas" };

  const code = genCode(recent);
  await db.otpCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  return { ok: true, phone, devCode: code, nome: doctorUser.name };
}

export type VerifyResult =
  | { ok: true; doctorId: string; nome: string }
  | { ok: false; error: "codigo_invalido" | "sem_medico" };

/** Confere o código mais recente não usado e devolve o médico correspondente. */
export async function verifyOtp(rawPhone: string, code: string): Promise<VerifyResult> {
  const phone = normalizePhone(rawPhone);

  const entry = await db.otpCode.findFirst({
    where: { phone, code: code.trim(), used: false, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!entry) return { ok: false, error: "codigo_invalido" };

  await db.otpCode.update({ where: { id: entry.id }, data: { used: true } });

  const doctor = await db.doctor.findFirst({
    where: { user: { phone } },
    include: { user: true },
  });
  if (!doctor) return { ok: false, error: "sem_medico" };

  return { ok: true, doctorId: doctor.id, nome: doctor.user.name };
}
