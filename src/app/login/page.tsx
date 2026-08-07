import { redirect } from "next/navigation";

// A tela de login demo (que NÃO verificava senha — qualquer credencial entrava)
// foi aposentada. O acesso do paciente agora é só pelo Supabase Auth em /entrar.
// Mantemos esta rota como redirect para não quebrar links antigos nem o retorno
// de erro do login social (que ainda pode cair aqui com ?erro=...).
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.erro;
  const erro = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  redirect(erro ? `/entrar?erro=${encodeURIComponent(erro)}` : "/entrar");
}
