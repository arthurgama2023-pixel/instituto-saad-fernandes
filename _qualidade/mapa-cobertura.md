# Mapa de Cobertura — Smart Doctor
Atualizado: 2026-08-07

**Estado geral: o projeto não tem rede de proteção automatizada.** Não há runner de
teste instalado. Tudo abaixo é 🔴 por ausência de infraestrutura, não por descuido
de um módulo específico — instalar um runner é a dívida raiz.

| Módulo/arquivo | Status | Testes | Última verificação |
|---|---|---|---|
| modules/scheduling/service.ts (hold/TTL, confirmação) | 🔴 sem teste | 0 | — |
| modules/urgency/* (corrida de aceite via `updateMany`) | 🔴 sem teste | 0 | — |
| modules/payments/service.ts (cobrança PIX mock, idempotência) | 🔴 sem teste | 0 | — |
| modules/auth/otp.ts (OTP por WhatsApp) | 🔴 sem teste | 0 | — |
| modules/catalog/seed.ts · modules/demo/seed-demo.ts | 🔴 sem teste | 0 | — |
| modules/ai/* (Clara: prompt, tools, fallback) | 🔴 sem teste | 0 | — |
| lib/session.ts, lib/patient-data.ts | 🔴 sem teste | 0 | — |
| lib/db.ts (runAsUser + RLS, Proxy/AsyncLocalStorage) | 🔴 sem teste | 0 | provado ao vivo contra Supabase: isolamento por usuário na rota real (07/ago) |
| prisma/rls.sql (políticas SELECT) | ⚪ não testável (SQL de infra) | 0 | aplicado + provado ao vivo no pooler Supabase (07/ago) |
| lib/clicksign.ts (cliente real da API Clicksign) | 🔴 sem teste | 0 | verificado ao vivo contra sandbox (06/ago) |
| lib/receituario-pdf.ts (gera PDF via pdf-lib) | 🔴 sem teste | 0 | verificado ao vivo (06/ago) |
| api/webhooks/clicksign (confirmação de assinatura) | ⚪ não testável sem URL pública | 0 | não disparado — sem certificado ICP real p/ testar |
| src/app/** (telas) | 🔴 sem teste | 0 | conferência manual no navegador |
| src/generated/prisma/** | ⚪ não testável (código gerado) | 0 | — |

Legenda: 🟢 testado · 🟡 parcial · 🔴 sem teste · ⚪ não testável (I/O real/rede)

**Onde doeria mais primeiro:** a corrida de aceite da urgência
(`status: "BUSCANDO"` + `updateMany`) e o TTL do hold de agendamento — são as duas
lógicas com concorrência real, onde um bug não aparece em teste manual.
