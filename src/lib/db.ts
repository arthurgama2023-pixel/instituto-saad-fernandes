import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEV_DB_URL, ensureDevDbDir } from "@/lib/dev-db-path";

const globalForDb = globalThis as unknown as { __db?: PrismaClient; __isPg?: boolean };

// Postgres em produção (Render via DATABASE_URL, Netlify via NETLIFY_DB_URL
// injetada pelo @netlify/database no deploy), SQLite no dev local.
// O provider do schema é ajustado por scripts/setup-db.mjs no build.
function createClient(): { client: PrismaClient; isPg: boolean } {
  // `||` (não `??`) para que DATABASE_URL="" (usado no .env.development.local para
  // forçar SQLite no dev, mesmo com o .env.local do Postgres presente) caia no ramo
  // local em vez de tentar o adapter-pg com o client gerado para sqlite.
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || "";
  if (/^postgres(ql)?:\/\//i.test(url)) {
    return { client: new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }), isPg: true };
  }
  ensureDevDbDir();
  return { client: new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: DEV_DB_URL }) }), isPg: false };
}

if (!globalForDb.__db) {
  const created = createClient();
  globalForDb.__db = created.client;
  globalForDb.__isPg = created.isPg;
}
const rawClient = globalForDb.__db;
const isPg = Boolean(globalForDb.__isPg);

// Contexto por-requisição: enquanto runAsUser() está ativo, `db` (o Proxy
// abaixo) resolve pra transação com RLS ligado — mesmo dentro de código que
// importa `db` no nível de módulo (os services em src/modules/**/service.ts,
// que recebem userId/doctorId como parâmetro mas não sabem nada de RLS).
// Fora de runAsUser(), cai no client cru de sempre.
const txContext = new AsyncLocalStorage<Prisma.TransactionClient>();

export const db: PrismaClient = new Proxy(rawClient, {
  get(target, prop, receiver) {
    const active = txContext.getStore();
    if (active && prop in active) return Reflect.get(active, prop, active);
    return Reflect.get(target, prop, receiver);
  },
}) as PrismaClient;

/**
 * Roda `fn` com RLS real ligado (Postgres/Supabase): abre uma transação,
 * seta `SET LOCAL ROLE authenticated` + `app.uid` (ver prisma/rls.sql pras
 * políticas que leem esse valor), e faz `db` resolver pra essa transação
 * enquanto `fn` roda — inclusive dentro de services que importam `db` direto.
 * No SQLite (dev local) é passthrough: `fn(db)` roda sem RLS, porque SQLite
 * não tem SET LOCAL ROLE/set_config — mesmo código funciona nos dois lados.
 *
 * Cuidado: o client de transação do Prisma não expõe $transaction/$connect/
 * $disconnect (fora da "interactive transaction" allowlist) — chamar
 * `db.$transaction(...)` de DENTRO de fn() cairia no client cru (fora do
 * Proxy) e abriria uma segunda transação, FORA do escopo de RLS. Se precisar
 * de uma sub-operação atômica dentro de fn(), opere direto no `tx` recebido.
 */
export async function runAsUser<T>(userId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  if (!isPg) return fn(db);
  return rawClient.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated`);
    await tx.$executeRaw`SELECT set_config('app.uid', ${userId}, true)`;
    return txContext.run(tx, () => fn(tx as unknown as PrismaClient));
  });
}
