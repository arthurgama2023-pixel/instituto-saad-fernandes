// Pipeline da Clara (Etapa 5 §2):
// [1] guarda determinística de urgência → [2] contexto → [3] agente (Claude ou local) → [4] persistência

import { db } from "@/lib/db";
import { ensureSeeded } from "@/modules/catalog/seed";
import {
  addMessage,
  getOrCreateConversation,
  getState,
  listMessages,
  setState,
  type MessagePayload,
} from "@/modules/conversation/service";
import { detectUrgency, emergencyMessage } from "@/modules/ai/urgency";
import { hasClaude, runClaraAgent } from "@/modules/ai/claude";
import { runLocalAgent, type LocalState } from "@/modules/ai/fallback";

export function aiMode(): "claude" | "local" {
  return hasClaude() ? "claude" : "local";
}

export async function handleIncoming(userId: string, text: string, channel = "web") {
  await ensureSeeded();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const conv = await getOrCreateConversation(userId, channel);

  await addMessage(conv.id, "user", text);

  // [1] Urgência nível 1 — determinística, independe do LLM
  const hit = detectUrgency(text);
  if (hit) {
    await db.urgencyEvent.create({
      data: { conversationId: conv.id, trigger: hit.trigger, level: 1 },
    });
    const payload: MessagePayload = { uiEvents: [{ type: "emergency" }], quickReplies: [] };
    await addMessage(conv.id, "clara", emergencyMessage(user.name.split(" ")[0], hit), payload);
    await setState(conv.id, {});
    return conv.id;
  }

  // [3] Agente
  if (hasClaude()) {
    try {
      const history = (await listMessages(conv.id)).map((m) => ({
        role: m.role as "user" | "clara" | "system",
        content: m.content,
      }));
      const result = await runClaraAgent(
        { userId, userName: user.name, conversationId: conv.id },
        history,
      );
      const quickReplies =
        result.uiEvents.find((e) => e.type === "doctors") !== undefined
          ? (result.uiEvents.find((e) => e.type === "doctors") as { items: unknown[] }).items.map(
              (_, i) => String(i + 1),
            )
          : [];
      await addMessage(conv.id, "clara", result.text, { uiEvents: result.uiEvents, quickReplies });
      return conv.id;
    } catch (err) {
      console.error("[clara] provedor falhou, caindo para o parser local:", err);
      // degrada para o local sem quebrar a conversa
    }
  }

  const state = await getState<LocalState>(conv.id);
  const result = await runLocalAgent(userId, user.name, text, state);
  await setState(conv.id, result.newState);
  await addMessage(conv.id, "clara", result.text, {
    uiEvents: result.uiEvents,
    quickReplies: result.quickReplies,
  });
  return conv.id;
}
