import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptRequest } from "@/modules/urgency/service";

const Body = z.object({
  chamadoId: z.string().min(1),
  medicoId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const result = await acceptRequest(parsed.data.chamadoId, parsed.data.medicoId);
  if (!result.ok) {
    // ja_aceita: outro médico chegou primeiro — é o caso normal da corrida.
    const status = result.error === "ja_aceita" ? 409 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
