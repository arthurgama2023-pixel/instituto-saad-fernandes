import { cookies } from "next/headers";

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
