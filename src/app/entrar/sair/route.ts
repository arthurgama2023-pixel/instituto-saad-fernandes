import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Encerra a sessão (limpa os cookies do Supabase Auth) e volta pro login.
export async function POST(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/entrar", req.url), { status: 303 });
}
