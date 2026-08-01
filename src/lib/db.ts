import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEV_DB_URL, ensureDevDbDir } from "@/lib/dev-db-path";

const globalForDb = globalThis as unknown as { __db?: PrismaClient };

// Postgres em produção (Render via DATABASE_URL, Netlify via NETLIFY_DB_URL
// injetada pelo @netlify/database no deploy), SQLite no dev local.
// O provider do schema é ajustado por scripts/setup-db.mjs no build.
function createClient(): PrismaClient {
  // `||` (não `??`) para que DATABASE_URL="" (usado no .env.development.local para
  // forçar SQLite no dev, mesmo com o .env.local do Postgres presente) caia no ramo
  // local em vez de tentar o adapter-pg com o client gerado para sqlite.
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || "";
  if (/^postgres(ql)?:\/\//i.test(url)) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  ensureDevDbDir();
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: DEV_DB_URL }),
  });
}

export const db: PrismaClient = globalForDb.__db ?? (globalForDb.__db = createClient());
