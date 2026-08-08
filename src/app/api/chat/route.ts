import { NextRequest, NextResponse } from "next/server";
import { getPatientUser } from "@/lib/session";
import { ensureSeeded } from "@/modules/catalog/seed";
import { getOrCreateConversation, listMessages } from "@/modules/conversation/service";
import { WELCOME, WELCOME_CHIPS } from "@/modules/conversation/welcome";
import { aiMode, handleIncoming } from "@/modules/ai";

async function serialize(conversationId: string) {
  const messages = await listMessages(conversationId);
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    payload: m.payload ? JSON.parse(m.payload) : null,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function GET() {
  await ensureSeeded();
  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const conv = await getOrCreateConversation(user.id);
  // Transação: re-checa dentro do lock p/ não duplicar a boas-vindas em GETs
  // concorrentes (React StrictMode dispara o efeito 2x em dev).
  const { db } = await import("@/lib/db");
  await db.$transaction(async (tx) => {
    const count = await tx.message.count({ where: { conversationId: conv.id } });
    if (count === 0) {
      await tx.message.create({
        data: {
          conversationId: conv.id,
          role: "clara",
          content: WELCOME,
          payload: JSON.stringify({ quickReplies: WELCOME_CHIPS }),
        },
      });
    }
  });
  return NextResponse.json({
    userName: user.name,
    aiMode: aiMode(),
    messages: await serialize(conv.id),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const user = await getPatientUser();
  if (!user) return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  const convId = await handleIncoming(user.id, text);
  return NextResponse.json({
    userName: user.name,
    aiMode: aiMode(),
    messages: await serialize(convId),
  });
}
