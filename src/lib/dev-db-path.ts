import { mkdirSync } from "node:fs";

// O banco de dev fica em node_modules/.smart-doctor/, e não em prisma/, porque o
// watcher do Next observa a árvore do projeto: cada escrita no SQLite (toda
// request passa por expireStaleHolds) disparava um rebuild do Turbopack, que
// remontava a página, que fazia nova request — refresh infinito.
// node_modules é a única pasta que o watcher ignora de forma confiável.
// É banco de demonstração: se sumir num `npm ci`, o seed lazy recria.
const DIR = "node_modules/.smart-doctor";

export const DEV_DB_URL = `file:./${DIR}/dev.db`;

/** better-sqlite3 não cria a pasta do arquivo — garante que ela exista. */
export function ensureDevDbDir(): void {
  mkdirSync(DIR, { recursive: true });
}
