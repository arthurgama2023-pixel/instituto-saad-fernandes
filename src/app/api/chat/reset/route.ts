import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getOrCreateConversation, listMessages } from "@/modules/conversation/service";
import { WELCOME, WELCOME_CHIPS } from "@/modules/conversation/welcome";
import { aiMode } from "@/modules/ai";

// Reinicia a conversa do paciente demo: apaga as mensagens, zera o estado da
// máquina do parser local e recria a saudação. NÃO mexe nas consultas.
export async function POST() {
  const user = await getDemoUser();
  const conv = await getOrCreateConversation(user.id);

  await db.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { conversationId: conv.id } });
    await tx.conversation.update({ where: { id: conv.id }, data: { state: "{}" } });
    await tx.message.create({
      data: {
        conversationId: conv.id,
        role: "clara",
        content: WELCOME,
        payload: JSON.stringify({ quickReplies: WELCOME_CHIPS }),
      },
    });
  });

  const messages = await listMessages(conv.id);
  return NextResponse.json({
    userName: user.name,
    aiMode: aiMode(),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      payload: m.payload ? JSON.parse(m.payload) : null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
