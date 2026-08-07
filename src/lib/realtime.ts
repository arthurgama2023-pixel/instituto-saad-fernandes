// Aviso de mudança na fila de médicos via Supabase Realtime (modo Broadcast).
// O servidor publica no canal "admin-medicos" pelo endpoint HTTP de broadcast
// do Supabase; o painel do admin (client) escuta e recarrega a fila. Broadcast
// é barramento de mensagens — não depende do banco estar no Supabase, e não
// expõe nenhuma coluna. No-op seguro se o Supabase não estiver configurado.

export const CANAL_MEDICOS = "admin-medicos";
export const EVENTO_MUDOU = "mudou";

export async function avisarMudancaMedicos(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return; // sem Supabase, segue sem realtime

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({
        messages: [{ topic: CANAL_MEDICOS, event: EVENTO_MUDOU, payload: { at: Date.now() } }],
      }),
    });
  } catch {
    // Realtime é enfeite: se o broadcast falhar, o painel ainda atualiza no F5.
  }
}
