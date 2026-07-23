# Smart Doctor 🩺✦

**Inteligência que cuida.** Telemedicina com a Clara — a secretária médica com IA que agenda consultas por conversa.

Documentação completa da startup (9 etapas): [`docs/00-INDICE.md`](docs/00-INDICE.md)

## Rodar (modo demo — zero configuração)

```bash
npm install
npm run db:push   # cria SQLite local + client Prisma
npm run dev       # http://localhost:3080
```

Sem chave nenhuma, a Clara roda com o **parser local PT-BR** (fluxo completo: sintoma → especialidade → médico → horário → reserva 15 min → PIX simulado → confirmação → cancelamento/reembolso).

### Navegação (portal em `/`)

- `/paciente` — app do paciente (Início · Agenda · Clara · Saúde · Perfil), bottom nav com FAB da Clara
- `/medico` — painel do médico (Dashboard com resumo da Clara · Agenda · Pacientes · Financeiro); seletor de médico no topo (`?d=<id>`)
- `/admin` — painel admin (Visão geral com funil da Clara · Médicos/aprovação · Clara(IA) · Financeiro)

Dados demo (5 pacientes, ~15 consultas, 48 conversas, 2 médicos pendentes) são semeados na primeira visita a `/medico` ou `/admin`.

Com `ANTHROPIC_API_KEY` no `.env`, a Clara vira agente **Claude Opus 4.8** com function calling (7 ferramentas) — mesmo fluxo, conversa livre.

## Estado do MVP

| Fase | Escopo | Status |
|---|---|---|
| **B1** | Fundação: schema, serviços, Clara (Claude + fallback), urgência determinística, chat web, PIX mock | ✅ |
| **B1.5** | Portal + 3 painéis com dados demo: app do Paciente (bottom nav), painel do Médico, painel do Admin | ✅ |
| **B1.6** | PWA instalável (manifest + ícone + standalone) com botão "Instalar app"; reset de conversa; `allowedDevOrigins` p/ acesso via IP no celular | ✅ |
| **B1.7** | Toggle de tema claro/escuro (☀️/🌙) em todas as telas, persistente (localStorage) e sem flash; badge de dev do Next escondido | ✅ |
| B2 | Canal WhatsApp (Evolution API: pareamento, webhook, allowlist) + login OTP | ⏳ |
| B3 | Pagamento real (Pagar.me/Mercado Pago sandbox + webhook + split) | ⏳ |
| B4 | Painel do médico (onboarding CRM, agenda, consulta) | ⏳ |
| B5 | Admin (funil da Clara, aprovação) + deploy Render | ⏳ |

## Arquitetura (resumo)

- Next.js 16 + TypeScript · Prisma 7 (SQLite dev / Postgres prod — troca por `DATABASE_URL`)
- Módulos por interface em `src/modules/` (`ai`, `catalog`, `scheduling`, `payments`, `conversation`) — Etapa 6 dos docs
- **Urgência em 2 camadas**: dicionário determinístico (`ai/urgency.ts`, roda antes do LLM) + tool `sinalizar_urgencia`
- Tools = única fonte de verdade (a IA nunca inventa médico/horário/preço)
- Reserva de slot com TTL 15 min + expiração lazy; exclusividade por transação
