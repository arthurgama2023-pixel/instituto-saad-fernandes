import { defineConfig } from "prisma/config";
import { DEV_DB_URL, ensureDevDbDir } from "./src/lib/dev-db-path";

ensureDevDbDir();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Dev local: SQLite. Em produção vira a connection string do Postgres —
    // DATABASE_URL (Render) ou NETLIFY_DB_URL (Netlify, injetada automaticamente
    // pelo @netlify/database no deploy).
    url: process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || DEV_DB_URL,
  },
});
