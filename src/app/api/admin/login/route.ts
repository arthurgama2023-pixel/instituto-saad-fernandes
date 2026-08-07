import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { conferirCredenciais, credenciaisConfiguradas, setAdminSession } from "@/lib/admin-session";

const Body = z.object({
  usuario: z.string().trim().min(1),
  senha: z.string().min(1),
});

/** Login do admin: confere usuário+senha (do ambiente) e grava a sessão. */
export async function POST(req: NextRequest) {
  if (!credenciaisConfiguradas()) {
    return NextResponse.json(
      { error: "Acesso admin não configurado no servidor (defina ADMIN_USER e ADMIN_PASSWORD)." },
      { status: 503 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe usuário e senha." }, { status: 400 });

  if (!conferirCredenciais(parsed.data.usuario, parsed.data.senha)) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  await setAdminSession();
  return NextResponse.json({ ok: true });
}
