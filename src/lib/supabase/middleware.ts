import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Atualiza/propaga a sessão do Supabase Auth em toda requisição. Sem isto, o
// token não é revalidado e o servidor pode "não ver" o login — fazendo o app
// cair no usuário demo. É o padrão recomendado do @supabase/ssr.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: revalida a sessão (refresca o token se preciso). Não colocar
  // lógica entre createServerClient e getUser, pra não introduzir bugs de
  // sessão difíceis de depurar.
  await supabase.auth.getUser();

  return supabaseResponse;
}
