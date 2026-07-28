import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEV_DB_URL, ensureDevDbDir } from "@/lib/dev-db-path";

const globalForDb = globalThis as unknown as { __db?: PrismaClient };

// Postgres em produção (Render), SQLite no dev local.
// O provider do schema é ajustado por scripts/setup-db.mjs no build.
function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (url && /^postgres(ql)?:\/\//i.test(url)) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  ensureDevDbDir();
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: url ?? DEV_DB_URL }),
  });
}

export const db: PrismaClient = globalForDb.__db ?? (globalForDb.__db = createClient());
