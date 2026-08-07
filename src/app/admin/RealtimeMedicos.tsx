"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CANAL_MEDICOS, EVENTO_MUDOU } from "@/lib/realtime";

// Escuta o canal Supabase Realtime (Broadcast) e recarrega os server components
// quando a fila de médicos muda (novo cadastro, aprovação, recusa) — o painel
// atualiza sozinho, sem F5. Silencioso: nenhum visual, só o refresh.
export function RealtimeMedicos() {
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

    const supabase = createClient();
    const canal = supabase
      .channel(CANAL_MEDICOS)
      .on("broadcast", { event: EVENTO_MUDOU }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}
