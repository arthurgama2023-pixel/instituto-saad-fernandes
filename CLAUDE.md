# Smart Doctor — notas do projeto

App Next 16 + Prisma 7 (SQLite em dev). Porta **3080** (`npm run dev`).
Três interfaces: `/paciente` (app do paciente), `/medico`, `/admin`.

## Duas camadas de estilo convivendo

O app do paciente usa a identidade **Smart Doctor** (Material Design 3 no verde da
marca, Manrope + Plus Jakarta Sans, Material Symbols). Os painéis `/medico` e
`/admin` ainda usam o design system **Pulse** (CSS artesanal).

> Histórico: o app já foi rebrandado para "Instituto Saad Fernandes" (identidade
> editorial, dourado + serifa) e voltou para Smart Doctor no commit `5f2dd02`.
> O nome **Saad Fernandes** só sobrevive como *dado* de demonstração (médico
> responsável no seed), nunca como marca da interface.

- `src/app/brand.css` — Tailwind v4 + tokens da marca em `@theme`. **Sem preflight**:
  o reset global quebraria os painéis Pulse. No lugar dele há um reset escopado em
  `.brand-app` (aplicado pelo `src/app/paciente/layout.tsx`).
- `src/app/globals.css` — CSS Pulse, todo dentro de `@layer pulse`.

**Os dois lados têm tokens de cor separados.** Mexer no verde da marca em
`brand.css` NÃO alcança `/medico` e `/admin` — o Pulse tem os próprios
`--primary`/`--aurora` no topo do `globals.css`, repetidos em 4 blocos (`:root`,
`@media dark`, `[data-theme=dark]`, `[data-theme=light]`). Trocar a marca exige
os dois arquivos.

`--primary` do Pulse é usado tanto como **fundo de botão com texto branco** quanto
como **texto de acento**, então qualquer cor nova precisa passar 4.5:1 nos dois
papéis. É por isso que o verde do Pulse (`#07845a` claro / `#16a34a` escuro) é mais
fundo que o Verde Profundo da marca (`#0aa46e`, que dá 3.2:1 com branco em cima).
O verde vivo `#3fce3c` só entra no gradiente, onde é fill e não texto.

**Gotcha que custou tempo:** nomes genéricos do Pulse (`.block`, `.info`, `.title`)
colidem com utilitários do Tailwind. Regra sem camada vence regra em camada, então
o CSS Pulse *precisa* ficar em `@layer pulse`, declarada antes de `utilities` na
ordem `theme, base, components, pulse, utilities`. A única regra intencionalmente
fora de camada é `body:has(.brand-app)`, que força o fundo claro da marca por cima
do tema escuro do Pulse.

## Dados

Seed lazy e idempotente na primeira request: `modules/catalog/seed.ts`
(especialidades tricologia/dermatologia/clinica-geral + 4 médicos, com
Dr. Saad Fernandes como responsável técnico — dado demo, não marca)
e `modules/demo/seed-demo.ts`
(pacientes e consultas para os painéis).

Para re-semear depois de mexer no seed: arquive o `.db` e rode `npm run db:push`
— `ensureSeeded` só popula quando a tabela está vazia.

**O banco de dev mora em `node_modules/.smart-doctor/dev.db`** (caminho em
`lib/dev-db-path.ts`), não em `prisma/`. Motivo: o watcher do Next observa a árvore
do projeto e *toda* request escreve no SQLite (`expireStaleHolds`), então cada
request disparava um rebuild do Turbopack → remontagem → nova request → **refresh
infinito**. `watchOptions` do Next 16 só aceita `pollIntervalMs`, não tem `ignored`;
`node_modules` é a pasta que o watcher ignora de forma confiável.

**Nunca rode `npm run build` com o `npm run dev` no ar.** O build regenera
`src/generated/prisma/**`, `next-env.d.ts` e `prisma/schema.prisma` debaixo do
watcher e derruba o Turbopack com `FATAL: Next.js package not found` — o sintoma é
a página recarregando sozinha sem parar. Conserto: parar o dev, `rm -rf .next`,
subir de novo.

## Urgência (fluxo estilo Uber)

`/paciente/urgencia` (aba da bottom nav) abre um `UrgencyRequest`; todos os médicos
ativos da especialidade veem na caixa do `/medico` e o **primeiro que aceitar** fica
com ele. Só no aceite nascem a consulta e a cobrança — o paciente paga depois.

A corrida entre médicos é resolvida por `updateMany` condicionado a
`status: "BUSCANDO"`: quem atualiza 1 linha ganhou, os outros recebem 409. Não use
`findUnique` + `update` no lugar disso — abre janela para aceite duplo.

Os dois lados usam **polling de 3s** (sem websocket). O lado do paciente só faz
polling enquanto o chamado está `BUSCANDO`, para não bater no servidor à toa.

Chamado expira em 10 min sem aceite; o hold da consulta segue o TTL de 15 min do
agendamento normal. Ambas as expirações são lazy, sem worker.

## Clara

O chat da Clara **saiu do app do paciente** (a aba Mensagens virou Urgência). O
componente, as rotas `/api/chat` e o módulo `modules/ai` continuam no repo porque o
painel admin ainda mede o funil da Clara. A tela antiga foi para `_archive/mensagens/`.

## Sessão

`lib/session.ts` cria o paciente demo por cookie e **escreve o cookie**, o que só é
permitido em route handler. Por isso as telas do paciente são client components que
consomem `/api/paciente` (hook `lib/patient-data.ts`), em vez de server components.
