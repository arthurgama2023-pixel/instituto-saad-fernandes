import { db } from "@/lib/db";
import { normalizePhone } from "./otp";

const CODE_TTL_MS = 5 * 60 * 1000; // código vale 5 min
const MAX_PER_HOUR = 5; // trava anti-spam por telefone

function genCode(seed: number): string {
  const n = (Math.floor(Math.random() * 900000) + 100000 + seed) % 1000000;
  return String(n).padStart(6, "0");
}

export type SendResult =
  | { ok: true; phone: string; devCode: string; nome: string }
  | { ok: false; error: "nao_cadastrado" | "muitas_tentativas" };

/** Mesmo esquema do OTP do médico (modules/auth/otp.ts), só que para paciente. */
export async function sendPatientOtp(rawPhone: string): Promise<SendResult> {
  const phone = normalizePhone(rawPhone);

  const user = await db.user.findFirst({ where: { phone, role: "PATIENT" } });
  if (!user) return { ok: false, error: "nao_cadastrado" };

  const oneHourAgo = new Date(Date.now() - 3600_000);
  const recent = await db.otpCode.count({ where: { phone, createdAt: { gte: oneHourAgo } } });
  if (recent >= MAX_PER_HOUR) return { ok: false, error: "muitas_tentativas" };

  const code = genCode(recent);
  await db.otpCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  return { ok: true, phone, devCode: code, nome: user.name };
}

export type VerifyResult =
  | { ok: true; userId: string; nome: string }
  | { ok: false; error: "codigo_invalido" | "sem_paciente" };

export async function verifyPatientOtp(rawPhone: string, code: string): Promise<VerifyResult> {
  const phone = normalizePhone(rawPhone);

  const entry = await db.otpCode.findFirst({
    where: { phone, code: code.trim(), used: false, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!entry) return { ok: false, error: "codigo_invalido" };

  await db.otpCode.update({ where: { id: entry.id }, data: { used: true } });

  const user = await db.user.findFirst({ where: { phone, role: "PATIENT" } });
  if (!user) return { ok: false, error: "sem_paciente" };

  return { ok: true, userId: user.id, nome: user.name };
}
