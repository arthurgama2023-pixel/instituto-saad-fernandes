import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "sd_doctor";

/** Grava o médico logado (via OTP) num cookie httpOnly. */
export async function setDoctorSession(doctorId: string) {
  const jar = await cookies();
  jar.set(COOKIE, doctorId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
}

export async function getDoctorSession(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function clearDoctorSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * Resolve o médico REALMENTE autenticado (para ações sensíveis, como o
 * certificado digital). Nunca confia em doctorId vindo do cliente nem no
 * seletor "?d=" do painel. Ordem: sessão OTP (sd_doctor) → login social
 * (sd_uid de um usuário com papel DOCTOR). Retorna o Doctor.id ou null.
 */
export async function getAuthedDoctorId(): Promise<string | null> {
  const jar = await cookies();

  const viaOtp = jar.get(COOKIE)?.value;
  if (viaOtp) {
    const d = await db.doctor.findUnique({ where: { id: viaOtp }, select: { id: true } });
    if (d) return d.id;
  }

  const uid = jar.get("sd_uid")?.value;
  if (uid) {
    const user = await db.user.findUnique({ where: { id: uid }, select: { role: true } });
    if (user?.role === "DOCTOR") {
      const doc = await db.doctor.findUnique({ where: { userId: uid }, select: { id: true } });
      if (doc) return doc.id;
    }
  }

  return null;
}

/**
 * Ponte Doctor.id -> Doctor.userId, pro caso de uso com runAsUser() (que
 * chaveia RLS em User.id, não em Doctor.id). Repete a mesma autenticação
 * real de getAuthedDoctorId() — não aceita doctorId vindo do cliente.
 */
export async function getAuthedDoctorUserId(): Promise<string | null> {
  const doctorId = await getAuthedDoctorId();
  if (!doctorId) return null;
  const doc = await db.doctor.findUnique({ where: { id: doctorId }, select: { userId: true } });
  return doc?.userId ?? null;
}
