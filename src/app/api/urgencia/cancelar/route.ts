import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser } from "@/lib/session";
import { cancelRequest, currentRequest, serializeRequest } from "@/modules/urgency/service";

const Body = z.object({ chamadoId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const user = await getDemoUser();
  const ok = await cancelRequest(parsed.data.chamadoId, user.id);
  if (!ok) {
    // Cancelar depois que um médico aceitou não pode: já existe consulta e cobrança.
    return NextResponse.json({ error: "chamado não está mais em busca" }, { status: 409 });
  }

  return NextResponse.json({ chamado: serializeRequest(await currentRequest(user.id)) });
}
