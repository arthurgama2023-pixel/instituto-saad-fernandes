import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para o servidor (Server Components, Route Handlers). Lê e
// escreve a sessão nos cookies via @supabase/ssr. É a partir daqui que o app
// vai saber quem está logado (auth.uid) e, no wiring nativo, passar essa
// identidade pro RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Em Server Components, escrever cookie pode lançar (contexto só de
          // leitura) — o middleware/route handler é quem persiste a sessão.
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* ignorado fora de route handler / middleware */
          }
        },
      },
    }
  );
}
