// Agente Clara via Claude Opus 4.8 (Etapa 5 §3) — loop manual de tool use.
// Loop manual (não o tool runner beta) para manter controle transparente do executor
// e coletar uiEvents por request sem dependência de helpers beta.

import Anthropic from "@anthropic-ai/sdk";
import { CLARA_SYSTEM_PROMPT } from "@/modules/ai/prompt";
import { TOOLS, type ToolContext } from "@/modules/ai/tools";
import { nowBR } from "@/modules/shared/format";
import type { UiEvent } from "@/modules/conversation/service";

const MODEL = process.env.CLARA_MODEL ?? "claude-opus-4-8";
const MAX_TOOL_ROUNDS = 8;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type AgentResult = { text: string; uiEvents: UiEvent[] };

export async function runClaraAgent(
  ctx: Omit<ToolContext, "uiEvents">,
  history: { role: "user" | "clara" | "system"; content: string }[],
): Promise<AgentResult> {
  const uiEvents: UiEvent[] = [];
  const toolCtx: ToolContext = { ...ctx, uiEvents };

  const tools: Anthropic.Tool[] = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool["input_schema"],
  }));

  const system = `${CLARA_SYSTEM_PROMPT}\n\n# Contexto da sessão\nAgora é ${nowBR()}. Paciente: ${ctx.userName}. Canal: chat web (demo).`;

  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role !== "system")
    .slice(-30)
    .map((m) => ({ role: m.role === "clara" ? "assistant" : "user", content: m.content }));

  const anthropic = getClient();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tools,
      messages,
    });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { text: text || "Desculpa, não entendi — pode repetir?", uiEvents };
    }

    // Executa todas as tools do turno e devolve TODOS os resultados numa única mensagem user
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const def = TOOLS.find((t) => t.name === tu.name);
      let output: string;
      let isError = false;
      if (!def) {
        output = JSON.stringify({ erro: "ferramenta_desconhecida" });
        isError = true;
      } else {
        try {
          output = await def.run(toolCtx, tu.input as Record<string, unknown>);
        } catch (err) {
          console.error(`[clara] tool ${tu.name} falhou:`, err);
          output = JSON.stringify({ erro: "falha_interna_da_ferramenta" });
          isError = true;
        }
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content: output, is_error: isError });
    }
    messages.push({ role: "user", content: results });
  }

  return {
    text: "Estou com dificuldade para concluir agora. Pode tentar de novo em instantes? 💙",
    uiEvents,
  };
}
