---
name: check-seed
description: Verifica se o banco de dev do Smart Doctor (SQLite em node_modules/.smart-doctor/dev.db) está semeado — conta especialidades, médicos, pacientes, consultas e urgências, e diagnostica o que fazer se algo estiver vazio ou faltando. Use sempre que o usuário perguntar se o seed rodou, por que a lista de médicos/especialidades está vazia no app, por que não aparecem pacientes ou consultas demo nos painéis, ou pedir para "checar o banco", "ver se o seed populou" ou "resetar/re-semear os dados de dev" neste projeto.
---

# Checar o seed do banco (Smart Doctor)

O seed deste projeto é **lazy e idempotente**: `ensureSeeded` só popula as
tabelas na primeira request real ao Next, e só se elas estiverem vazias
(`modules/catalog/seed.ts` para especialidades/médicos, `modules/demo/seed-demo.ts`
para pacientes/consultas demo). Isso significa que rodar `prisma db push` sozinho
NÃO popula nada — o banco fica com schema mas vazio até alguém acessar uma rota.

## Como checar

Rode o script bundlado, que lê o SQLite diretamente com `better-sqlite3` (já é
dependência do projeto, então não precisa gerar o Prisma Client nem depender de
`sqlite3` estar instalado no sistema — no Windows normalmente não está):

```bash
node .claude/skills/check-seed/scripts/check-seed.mjs
```

Ele imprime a contagem de cada tabela relevante e um diagnóstico:

- **Banco não existe**: normal se o `npm run dev` nunca rodou. Basta subir o
  servidor e acessar qualquer rota.
- **Tabela ausente** (erro ao contar): schema desatualizado — rode `npm run db:push`.
- **Catálogo vazio** (0 especialidades/médicos): o seed lazy ainda não disparou.
  Suba `npm run dev` (porta 3080) e acesse a home ou `/paciente` — a primeira
  request popula.
- **Catálogo OK mas demo vazio** (0 pacientes/consultas): confirme que
  `modules/demo/seed-demo.ts` rodou; mesma lógica lazy.
- **Tudo OK**: reporte as contagens ao usuário sem rodar nada mais.

## Re-semear do zero

Só é preciso quando o seed foi editado e o banco já tem dados antigos (o
`ensureSeeded` não sobrescreve nada se a tabela não estiver vazia):

1. Pare o `npm run dev`.
2. Apague ou arquive `node_modules/.smart-doctor/dev.db`.
3. Rode `npm run db:push` para recriar o schema.
4. Suba `npm run dev` de novo e acesse uma rota — o seed lazy repopula.

Nunca rode `npm run build` com o dev no ar para "forçar" isso — regenera o
Prisma Client e o schema debaixo do watcher do Turbopack e derruba o servidor
(ver CLAUDE.md, seção "Nunca rode npm run build com o npm run dev no ar").
