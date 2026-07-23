import { db } from "@/lib/db";

export type UiEvent =
  | { type: "doctors"; items: unknown[] }
  | { type: "payment"; payment: { id: string; pixCode: string; amountCents: number; status: string } }
  | { type: "appointment"; appt: unknown }
  | { type: "emergency" };

export type MessagePayload = { uiEvents?: UiEvent[]; quickReplies?: string[] };

export async function getOrCreateConversation(userId: string, channel = "web") {
  const existing = await db.conversation.findFirst({ where: { userId, channel } });
  if (existing) return existing;
  return db.conversation.create({ data: { userId, channel } });
}

export async function addMessage(
  conversationId: string,
  role: "user" | "clara" | "system",
  content: string,
  payload?: MessagePayload,
) {
  return db.message.create({
    data: {
      conversationId,
      role,
      content,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

export async function listMessages(conversationId: string, take = 100) {
  return db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take,
  });
}

export async function getState<T>(conversationId: string): Promise<T> {
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  return JSON.parse(conv.state || "{}") as T;
}

export async function setState(conversationId: string, state: unknown) {
  await db.conversation.update({
    where: { id: conversationId },
    data: { state: JSON.stringify(state) },
  });
}
