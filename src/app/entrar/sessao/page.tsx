import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { LogoMark } from "@/components/LogoMark";
import { createClient } from "@/lib/supabase/server";

// Server Component — prova que a sessão do Supabase Auth chega ao SERVIDOR
// (via cookie), que é de onde o app vai saber quem está logado (auth.uid) para
// alimentar o RLS no wiring nativo. Ainda não gatilha dado do app; é a ponte.
export default async function SessaoAtual() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <main className="w-full max-w-[440px] mx-auto min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <LogoMark size={64} />
      {user ? (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
            <Icon name="verified_user" filled className="text-secondary" size={36} />
          </div>
          <h1 className="text-headline-md font-headline-md text-primary">Sessão ativa</h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            O servidor reconheceu seu login. Esta é a identidade que o RLS vai usar.
          </p>
          <dl className="w-full text-left text-body-sm font-body-sm bg-surface-container-lowest rounded-xl border border-outline-variant/50 divide-y divide-outline-variant/40">
            <Row k="Nome" v={(user.user_metadata?.name as string | undefined) ?? "—"} />
            {user.email && <Row k="E-mail" v={user.email} />}
            {user.phone && <Row k="Telefone" v={user.phone} />}
            <Row k="auth.uid" v={user.id} mono />
            <Row k="Papel" v={(user.user_metadata?.role as string | undefined) ?? user.role ?? "—"} />
          </dl>
          <form action="/entrar/sair" method="post" className="w-full">
            <button className="w-full h-12 rounded-2xl border border-outline-variant/60 text-label-lg font-label-lg text-primary hover:border-secondary transition-colors">
              Sair
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-headline-md font-headline-md text-primary">Nenhuma sessão</h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Você ainda não está logado.
          </p>
          <Link
            href="/entrar"
            className="sd-aurora w-full h-14 rounded-2xl text-label-lg font-label-lg flex items-center justify-center shadow-lg active:scale-[0.98] transition-transform"
          >
            IR PARA O LOGIN
          </Link>
        </>
      )}
    </main>
  );
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-on-surface-variant shrink-0">{k}</dt>
      <dd className={`text-primary text-right break-all ${mono ? "font-mono text-[11px]" : ""}`}>{v}</dd>
    </div>
  );
}
