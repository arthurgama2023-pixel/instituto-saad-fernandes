"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para o browser (componentes "use client"). Usa a anon key
// pública — a segurança dos dados vem do RLS no banco, não de esconder essa key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
