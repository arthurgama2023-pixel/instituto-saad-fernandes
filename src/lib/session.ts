// Sessão demo do MVP: um paciente por navegador via cookie.
// B2 substitui por OTP de WhatsApp (Etapa 3 §2.2).

import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "sd_uid";

export async function getDemoUser() {
  const jar = await cookies();
  const uid = jar.get(COOKIE)?.value;
  if (uid) {
    const user = await db.user.findUnique({ where: { id: uid } });
    if (user) return user;
  }
  const user = await db.user.create({ data: { name: "Marina Costa", role: "PATIENT" } });
  jar.set(COOKIE, user.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return user;
}
