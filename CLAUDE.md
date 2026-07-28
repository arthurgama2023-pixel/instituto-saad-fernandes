# Smart Doctor / Instituto Saad Fernandes — notas do projeto

App Next 16 + Prisma 7 (SQLite em dev). Porta **3080** (`npm run dev`).
Três interfaces: `/paciente` (app do paciente), `/medico`, `/admin`.

## Duas camadas de estilo convivendo

O app do paciente foi rebrandado para a identidade **Instituto Saad Fernandes**
(Material Design 3, Manrope + Noto Serif, Material Symbols). Os painéis `/medico`
e `/admin` ainda usam o design system **Pulse** (CSS artesanal).

- `src/app/brand.css` — Tailwind v4 + tokens da marca em `@theme`. **Sem preflight**:
  o reset global quebraria os painéis Pulse. No lugar dele há um reset escopado em
  `.brand-app` (aplicado pelo `src/app/paciente/layout.tsx`).
- `src/app/globals.css` — CSS Pulse, todo dentro de `@layer pulse`.

**Gotcha que custou tempo:** nomes genéricos do Pulse (`.block`, `.info`, `.title`)
colidem com utilitários do Tailwind. Regra sem camada vence regra em camada, então
o CSS Pulse *precisa* ficar em `@layer pulse`, declarada antes de `utilities` na
ordem `theme, base, components, pulse, utilities`. A única regra intencionalmente
fora de camada é `body:has(.brand-app)`, que força o fundo claro da marca por cima
do tema escuro do Pulse.

## Dados

Seed lazy e idempotente na primeira request: `modules/catalog/seed.ts`
(especialidades tricologia/dermatologia/clinica-geral + 4 médicos, com
Dr. Saad Fernandes como responsável técnico) e `modules/demo/seed-demo.ts`
(pacientes e consultas para os painéis).

Para re-semear depois de mexer no seed: arquive `prisma/dev.db` e rode
`npm run db:push` — `ensureSeeded` só popula quando a tabela está vazia.

## Sessão

`lib/session.ts` cria o paciente demo por cookie e **escreve o cookie**, o que só é
permitido em route handler. Por isso as telas do paciente são client components que
consomem `/api/paciente` (hook `lib/patient-data.ts`), em vez de server components.
