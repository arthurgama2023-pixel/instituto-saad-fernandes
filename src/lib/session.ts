// Resolve o usuário atual das requisições do paciente.
// Prioridade: sessão REAL do Supabase Auth (paciente logado) → usuário demo por
// cookie (fluxo antigo, sem login). Na primeira vez que um usuário logado
// aparece, cria um User no nosso banco vinculado ao auth.uid.
//
// Mantém o nome getDemoUser pra não tocar nas ~9 rotas que já importam — mas
// agora ele é session-aware. (Dívida de nome registrada; renomear depois.)

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const COOKIE = "sd_uid";

export async function getDemoUser() {
  // 1) Paciente logado de verdade (Supabase Auth)?
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      const existente = await db.user.findUnique({ where: { authId: authUser.id } });
      if (existente) return existente;
      const nome = ((authUser.user_metadata?.name as string | undefined) ?? "").trim() || "Paciente";
      return await db.user.create({ data: { authId: authUser.id, name: nome, role: "PATIENT" } });
    }
  } catch {
    // Sem Supabase configurado / erro de rede: cai no fluxo demo abaixo.
  }

  // 2) Sem login: usuário demo por cookie (comportamento antigo).
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

// Verdadeiro quando o usuário veio de um login real (tem authId). Usado para
// NÃO semear dados demo em contas reais (conta nova começa vazia).
export function isContaReal(user: { authId?: string | null }): boolean {
  return !!user.authId;
}
