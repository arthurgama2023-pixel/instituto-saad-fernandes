// Consulta direta ao SQLite de dev via better-sqlite3 (já é dependência do
// projeto — ver src/lib/db.ts). Não usa Prisma Client aqui de propósito: isso
// evita depender do client gerado e funciona mesmo se `prisma generate` nunca
// rodou nesta máquina.
import Database from "better-sqlite3";
import { existsSync } from "node:fs";

const DB_PATH = "node_modules/.smart-doctor/dev.db";

if (!existsSync(DB_PATH)) {
  console.log(`Banco não existe ainda em ${DB_PATH}.`);
  console.log("Isso é normal se o servidor dev nunca rodou. Suba `npm run dev` e");
  console.log("acesse qualquer rota — o seed lazy (ensureSeeded) cria e popula na primeira request.");
  process.exit(0);
}

const db = new Database(DB_PATH, { readonly: true });

function count(table, where = "") {
  try {
    const sql = `SELECT COUNT(*) AS n FROM "${table}"${where ? ` WHERE ${where}` : ""}`;
    return db.prepare(sql).get().n;
  } catch (err) {
    return null; // tabela não existe (schema desatualizado / db:push pendente)
  }
}

const specialties = count("Specialty");
const doctors = count("Doctor");
const patients = count("User", "role = 'PATIENT'");
const appointments = count("Appointment");
const urgencies = count("UrgencyRequest");

console.log(`Banco: ${DB_PATH}`);
console.log("---");
console.log(`Especialidades: ${specialties ?? "tabela ausente"}`);
console.log(`Médicos:        ${doctors ?? "tabela ausente"}`);
console.log(`Pacientes:      ${patients ?? "tabela ausente"}`);
console.log(`Consultas:      ${appointments ?? "tabela ausente"}`);
console.log(`Urgências:      ${urgencies ?? "tabela ausente"}`);

db.close();

const missingTables = [specialties, doctors, patients, appointments, urgencies].some((v) => v === null);
const catalogEmpty = specialties === 0 || doctors === 0;
const demoEmpty = patients === 0 && appointments === 0;

console.log("---");
if (missingTables) {
  console.log("Alguma tabela não existe — schema desatualizado. Rode `npm run db:push`.");
} else if (catalogEmpty) {
  console.log("Catálogo (especialidades/médicos) vazio. O seed lazy (modules/catalog/seed.ts) só");
  console.log("roda numa request real ao Next — suba `npm run dev` e acesse a home ou /paciente.");
} else if (demoEmpty) {
  console.log("Catálogo populado, mas sem dados demo (pacientes/consultas). Verifique se");
  console.log("modules/demo/seed-demo.ts rodou — mesma lógica lazy, na primeira request.");
} else {
  console.log("Seed OK: catálogo e dados demo presentes.");
}
console.log("");
console.log("Para re-semear do zero: pare o dev, arquive/apague node_modules/.smart-doctor/dev.db");
console.log("e rode `npm run db:push` (recria o schema); o seed lazy repopula na próxima request.");
