import { defineConfig } from "prisma/config";
import { DEV_DB_URL, ensureDevDbDir } from "./src/lib/dev-db-path";

ensureDevDbDir();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Dev local: SQLite. Em produção (Render) vira a connection string do Postgres.
    url: process.env.DATABASE_URL ?? DEV_DB_URL,
  },
});
