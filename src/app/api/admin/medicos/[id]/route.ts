import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-session";
import { setDoctorStatus } from "@/modules/admin/service";

const Body = z.object({ acao: z.enum(["aprovar", "recusar"]) });

/** Aprova (ACTIVE) ou recusa (SUSPENDED) um médico. Só admin autenticado. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Acesso restrito ao admin." }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ação inválida" }, { status: 400 });

  const status = parsed.data.acao === "aprovar" ? "ACTIVE" : "SUSPENDED";
  const res = await setDoctorStatus(id, status);
  if (!res.ok) return NextResponse.json({ error: "médico não encontrado" }, { status: 404 });

  // ativacaoLink volta pra ser exibido/usado quando o e-mail não está
  // configurado (dev) — o admin pode repassar o link ao médico.
  return NextResponse.json({ ok: true, status, ativacaoLink: res.ativacaoLink ?? null });
}
