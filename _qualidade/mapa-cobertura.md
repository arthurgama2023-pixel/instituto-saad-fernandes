# Mapa de Cobertura — Smart Doctor
Atualizado: 2026-08-06

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
| lib/assinatura-icp.ts (assinatura ICP mock — gera serial/titular) | 🔴 sem teste | 0 | conferência manual no navegador (06/ago) |
| src/app/** (telas) | 🔴 sem teste | 0 | conferência manual no navegador |
| src/generated/prisma/** | ⚪ não testável (código gerado) | 0 | — |

Legenda: 🟢 testado · 🟡 parcial · 🔴 sem teste · ⚪ não testável (I/O real/rede)

**Onde doeria mais primeiro:** a corrida de aceite da urgência
(`status: "BUSCANDO"` + `updateMany`) e o TTL do hold de agendamento — são as duas
lógicas com concorrência real, onde um bug não aparece em teste manual.
