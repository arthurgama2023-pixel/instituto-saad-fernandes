# Etapa 6 — Arquitetura Técnica

> Smart Doctor · Documento 6 de 9
> Filosofia: **monólito modular que nasce pronto para virar serviços** — módulos isolados por
> interface, comunicação interna por eventos, extração só quando um gargalo real doer.
> Microserviços no dia 1 é como contratar 12 secretárias para uma clínica vazia.

---

## 1. Visão geral

```
                                    ┌──────────────────────────────┐
   Paciente (WhatsApp) ───────────► │  WhatsApp Gateway            │
   Paciente (App Flutter iOS/And) ─►│  (Evolution API → Cloud API) │
   Paciente/Médico (Web Next.js) ─┐ └──────────┬───────────────────┘
   Admin (Web Next.js) ───────────┤            │ webhooks
                                  ▼            ▼
                        ┌─────────────────────────────────┐
                        │        API CORE (NestJS)        │
                        │  monólito modular · Node 22     │
                        │ ┌─────────┐ ┌────────┐ ┌──────┐ │
                        │ │identity │ │schedule│ │ ai   │ │
                        │ │catalog  │ │payments│ │(Clara)│ │
                        │ │records  │ │channels│ │audit │ │
                        │ └─────────┘ └────────┘ └──────┘ │
                        └───┬───────────┬───────────┬─────┘
                            │           │           │ eventos (outbox)
                  ┌─────────▼──┐  ┌─────▼─────┐ ┌───▼──────────────┐
                  │ PostgreSQL │  │   Redis   │ │ WORKERS (BullMQ) │
                  │  (Prisma 7)│  │cache/lock/│ │ lembretes·notif· │
                  │            │  │  filas    │ │ payouts·followups│
                  └────────────┘  └───────────┘ └──────────────────┘
                            │
      ┌─────────────┬───────┴──────┬──────────────┬─────────────┐
      ▼             ▼              ▼              ▼             ▼
  S3/R2         LiveKit        Gateway Pgto   Anthropic     FCM/APNs
 (arquivos,   (teleconsulta   (Pagar.me /    (Clara) +     (push)
  receitas)     WebRTC/SFU)    M. Pago split) Gemini/Groq
```

---

## 2. Stack recomendada (e por quê)

| Camada | Escolha | Justificativa |
|---|---|---|
| **Mobile** | **Flutter** (1 codebase → iOS, Android, iPad) | pedido do projeto; app único com "modo médico" (Etapa 4); tokens Pulse via `ThemeExtension` |
| **Web (paciente/médico/admin/site)** | **Next.js 16 + TypeScript** | SEO no site público (canal de aquisição), SSR nos perfis de médico, stack dominada pela equipe |
| **API Core** | **NestJS (Node 22 + TS)** | módulos/DI de fábrica — força os limites do monólito modular; separado do Next para escalar API e web de forma independente |
| **ORM / Banco** | **Prisma 7 + PostgreSQL 16** | padrão comprovado (ver gotchas conhecidos: `prisma.config.ts`, driver adapters, generate manual) |
| **Cache / Filas / Locks** | **Redis** (+ **BullMQ**) | lembretes agendados, filas de notificação, rate limit, lock de slot (TTL 15 min) |
| **Storage** | **Cloudflare R2** (S3-compatível) | receitas/exames/fotos; zero taxa de egress; URLs assinadas |
| **Vídeo (teleconsulta)** | **LiveKit Cloud** (MVP) → LiveKit self-host (escala) | WebRTC/SFU gerenciado, SDKs Flutter+Web ótimos, gravação server-side, preço por minuto previsível; alternativa rápida: Daily.co |
| **WhatsApp** | **Evolution API** (MVP/beta) → **WhatsApp Business Cloud API oficial** (produção séria) | Evolution valida rápido e barato (padrão já dominado); saúde exige a API oficial p/ compliance, templates aprovados e sem risco de ban |
| **Pagamentos** | **Pagar.me ou Mercado Pago** (split nativo) | PIX + cartão + **split automático** médico/plataforma (marketplace), webhooks de confirmação |
| **IA** | **Anthropic SDK** (Opus 4.8 / Haiku 4.5) + Gemini/Groq (STT) | decidido na Etapa 5; interface `AIProvider` p/ troca por config |
| **Push** | FCM (Android/Web) + APNs (iOS) via Firebase Messaging | padrão; templates da matriz de notificações (Etapa 3 §6.2) |
| **E-mail** | Resend | recibos, receitas em PDF, magic links |
| **Auth** | própria: OTP WhatsApp + sessão **jose** (JWT) + refresh; Apple/Google Sign-In no app | padrão comprovado no agenda-ai (sem NextAuth); 2FA opcional p/ médico/admin |
| **Assinatura digital de receita** | integração ICP-Brasil (BirdID/Vidaas) ou Memed/Nexodata | receita válida exige certificado do médico — parceiro especializado, não construímos |
| **Observabilidade** | Sentry + logs estruturados (pino) + OpenTelemetry + Better Stack (uptime/status page) | erro, trace e disponibilidade desde o dia 1 |

**Sobre o buzzword bingo do prompt original:** Kubernetes, RabbitMQ e microserviços ficam explicitamente **fora do MVP**. BullMQ/Redis cobre mensageria até dezenas de milhares de consultas/mês; K8s só quando houver time de infra dedicado (ver §9).

---

## 3. Módulos do monólito (bounded contexts)

Cada módulo expõe interface própria e **só conversa com outros por interface ou evento** — nunca importa model alheio direto. (Mesma disciplina do agenda-ai, que provou permitir trocar implementações sem refactor.)

| Módulo | Responsabilidade | Eventos que emite |
|---|---|---|
| `identity` | usuários, OTP, sessões, papéis, dependentes | `user.created` |
| `catalog` | médicos, especialidades, perfis públicos, aprovação | `doctor.approved`, `doctor.suspended` |
| `scheduling` | disponibilidade, slots, reservas TTL, consultas (máquina de estados da Etapa 3 §6.4) | `appointment.*` (requested/confirmed/completed/cancelled/no_show) |
| `payments` | cobranças, webhooks gateway, split, repasses, estornos | `payment.confirmed`, `payout.settled`, `refund.issued` |
| `telehealth` | salas LiveKit, tokens, gravação c/ consentimento, qualidade | `consult.started`, `consult.ended` |
| `records` | prontuário (append-only), receitas, atestados, exames | `prescription.issued` |
| `ai` | Clara: pipeline, tools, prompts versionados, evals | `urgency.flagged`, `conversation.escalated` |
| `channels` | WhatsApp, push, e-mail — interface `Channel` única | `message.sent/failed` |
| `reviews` | avaliações e moderação | `review.created` |
| `audit` | trilha imutável (assina cada evento com hash encadeado) | — |

**Comunicação assíncrona:** padrão **outbox** — o módulo grava o evento na mesma transação do dado; um dispatcher publica para BullMQ; consumidores idempotentes (chave `event_id`). Garante que "consulta confirmada sem lembrete agendado" seja impossível.

---

## 4. Modelo de dados (núcleo — Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  phone        String?  @unique          // identidade principal (OTP WhatsApp)
  email        String?  @unique
  name         String
  cpf          String?  @unique          // criptografado app-level (AES-256-GCM)
  role         Role     @default(PATIENT) // PATIENT | DOCTOR | ADMIN | SUPPORT
  dependents   Dependent[]
  createdAt    DateTime @default(now())
}

model Doctor {
  id             String   @id @default(cuid())
  userId         String   @unique
  crm            String                   // + uf; validado no CFM
  rqe            String?
  bio            String
  photoUrl       String
  priceCents     Int
  durationMin    Int      @default(30)
  modes          Mode[]                   // VIDEO | IN_PERSON
  status         DoctorStatus             // PENDING | ACTIVE | SUSPENDED
  commissionBps  Int      @default(1500)  // 15% — custom por médico
  specialties    DoctorSpecialty[]
  insurances     DoctorInsurance[]
  availability   AvailabilityRule[]       // janelas semanais + exceções
  payoutAccount  PayoutAccount?
}

model Specialty {
  id        String @id @default(cuid())
  name      String @unique
  icon      String
  colorKey  String                        // pastel do Pulse
  keywords  String[]                      // triagem da Clara ("dor de cabeça"…)
  priceRefCents Int?
}

model Appointment {
  id          String   @id @default(cuid())
  patientId   String
  dependentId String?
  doctorId    String
  startsAt    DateTime
  durationMin Int
  mode        Mode
  status      ApptStatus  // máquina de estados canônica (Etapa 3 §6.4)
  priceCents  Int
  holdUntil   DateTime?   // TTL da reserva (15 min)
  payment     Payment?
  record      RecordEntry[]
  review      Review?
  @@index([doctorId, startsAt])
  @@index([patientId, status])
}

model Payment {
  id            String   @id @default(cuid())
  appointmentId String   @unique
  method        PayMethod // PIX | CARD | INSURANCE
  amountCents   Int
  feeCents      Int                        // taxa da plataforma
  status        PayStatus // PENDING | CONFIRMED | REFUNDED | DISPUTED
  gatewayId     String    @unique          // idempotência com o gateway
  payoutId      String?
}

model RecordEntry {                        // prontuário: append-only, NUNCA update/delete
  id            String   @id @default(cuid())
  patientId     String
  appointmentId String?
  authorId      String                     // médico ou "clara"
  kind          RecordKind // CONSULT_NOTE | PRESCRIPTION | EXAM | CERTIFICATE | AI_SUMMARY
  content       Json                       // criptografado app-level
  contentHash   String                     // integridade
  createdAt     DateTime @default(now())
}

model Conversation { id, userId, channel, state Json, lastMessageAt, ... }
model Message      { id, conversationId, role, content, toolCalls Json?, tokens Int?, costMicros Int?, ... }
model UrgencyEvent { id, conversationId, level Int, trigger String, reviewedBy String?, outcome String?, ... }
model AuditLog     { id, actorId, action, entity, entityId, reason String?, prevHash, hash, createdAt }  // encadeado
model Setting / PromptVersion / EvalRun / Review / Insurance / OutboxEvent ...
```

Decisões de dados importantes:
- **Prontuário append-only** com hash de conteúdo — correção = nova entrada referenciando a anterior (exigência médico-legal).
- **CPF e conteúdo clínico criptografados na aplicação** (AES-256-GCM, chave no KMS) — vazamento de dump ≠ vazamento de dados sensíveis.
- **Slot não é tabela**: disponibilidade é regra (`AvailabilityRule`) + consultas ocupadas; slots são calculados. Reserva = `Appointment` com `holdUntil` (evita milhões de linhas de slot vazio).
- **Dinheiro em centavos (Int)**, custos de IA em micros. Nunca float.
- Migrations Prisma versionadas; `DATABASE_URL` troca dev (SQLite não! — Postgres via Docker local) / prod.

---

## 5. APIs

### 5.1 Superfície

- **REST JSON + OpenAPI** gerado (NestJS decorators) — consumida por Flutter, Next e integrações futuras (convênios).
- Versionamento por path (`/v1/...`). Erros no padrão problem+json com códigos estáveis (`slot_taken`, `hold_expired`, `confirmation_required`…).
- Auth: `Authorization: Bearer` (sessão jose); scopes por papel; admin exige 2FA.

### 5.2 Endpoints principais (resumo)

```
POST /v1/auth/otp/request · /verify          # login sem senha
GET  /v1/specialties · /doctors?filtros      # busca (a MESMA usada pela tool da Clara)
GET  /v1/doctors/:id/slots?from&to
POST /v1/appointments/hold                   # reserva TTL 15min (lock Redis + unique parcial)
POST /v1/appointments/:id/confirm · /cancel · /reschedule
POST /v1/payments/:id/pix · /card
GET  /v1/me/appointments · /records · /prescriptions
POST /v1/consults/:id/token                  # token LiveKit (valida participante + janela)
POST /v1/records (médico) · /prescriptions   # assinatura digital
POST /v1/webhooks/whatsapp?token=            # entrada da Clara
POST /v1/webhooks/payments                   # gateway (verifica assinatura, idempotente)
ADMIN: /v1/admin/doctors/:id/approve · /prompts · /evals/run · /audit ...
```

**Regra de ouro:** as tools da Clara (Etapa 5 §4) chamam **exatamente estes endpoints** por dentro (mesma autorização, mesmo rate limit) — a IA não tem porta dos fundos.

### 5.3 Concorrência do agendamento (o problema clássico)

```
hold: SET redis lock slot:{doctorId}:{startsAt} NX EX 900
      + INSERT Appointment(status=solicitada, holdUntil=now()+15min)
      + constraint UNIQUE parcial (doctorId, startsAt) WHERE status NOT IN (cancelada, expirada)
confirm: transição atômica aguardando_pagamento→confirmada (UPDATE ... WHERE status=...)
expiração: job BullMQ com delay=15min → libera se ainda aguardando
```
Dupla marcação é impossível mesmo com Redis fora do ar (a constraint do Postgres é a última linha de defesa).

---

## 6. Workers e jobs (BullMQ)

| Fila | Jobs | Observação |
|---|---|---|
| `reminders` | lembrete 24h (interativo), 15min (link da sala), follow-up urgência 12h, retorno em N dias | agendados na confirmação; cancelados junto com a consulta |
| `notifications` | fan-out da matriz evento×canal (Etapa 3 §6.2) | retry exponencial; DLQ com alerta |
| `payouts` | repasse D+2 pós-conclusão, conciliação diária | idempotente por `appointmentId` |
| `holds` | expirar reservas de 15 min | |
| `ai-batch` | evals offline (Batch API), resumos noturnos, funil | fora do horário de pico |
| `webhooks-in` | processamento de webhook (WhatsApp/gateway) fora do request | responder 200 rápido, processar async |

---

## 7. Teleconsulta (LiveKit)

- Sala criada na confirmação (`consult_{appointmentId}`); tokens JWT curtos emitidos só p/ os 2 participantes, válidos de -10min a +duração+30min.
- Cliente Flutter/Web com adaptação de banda (SFU); fallback áudio-só automático; reconexão 2 min.
- **Gravação**: OFF por padrão; exige consentimento registrado de AMBOS (auditado); arquivo criptografado no R2, retenção 90 dias, acesso logado.
- Eventos de qualidade (jitter, quedas) → métricas por consulta (base para a política de reagendamento grátis).

---

## 8. Ambientes, CI/CD e deploy

| Fase | Infra | Racional |
|---|---|---|
| **MVP → primeiros milhares de usuários** | **Render**: web (Next), api (NestJS), workers, Postgres gerenciado, Redis (Upstash). Cloudflare na frente (DNS/CDN/WAF) | plataforma já dominada (agenda-ai em produção lá); deploy por push; barato; zero time de infra |
| **Tração (≥ ~50k consultas/mês)** | Containers em AWS ECS/Fargate ou GCP Cloud Run + RDS/Cloud SQL + ElastiCache; IaC (Terraform) | limites do PaaS: réplicas de leitura, VPC p/ compliance, custos |
| **Escala grande** | Aí sim: K8s, filas dedicadas, múltiplas regiões | só com time de plataforma |

CI/CD (GitHub Actions): lint + typecheck + testes + **evals da Clara** (suite bloqueante) → staging (dados sintéticos) → prod com migration gate. Feature flags simples via `Setting` (padrão que já usamos). Backups: Postgres PITR + snapshot diário testado por restore automático mensal (LGPD/ANPD exige plano real de recuperação).

---

## 9. Escalabilidade e SLOs

**Gargalos previstos, na ordem em que vão doer:**

1. **Webhook WhatsApp em pico** → já resolvido por design (fila `webhooks-in`, resposta 200 imediata).
2. **Busca de médicos** → cache Redis 60s por (especialidade+filtros); Postgres `tsvector` para busca textual (Elasticsearch só muito depois).
3. **Cálculo de slots** → materializar disponibilidade dos próximos 14 dias por médico em cache, invalidada por evento.
4. **Postgres leitura** → read replica (relatórios/admin apontam pra réplica primeiro).
5. **Custo de IA** → caching (já), roteamento Haiku, circuit breaker por usuário.

**SLOs iniciais:** API p95 < 300ms · resposta da Clara p95 < 6s (com tools) · disparo de lembrete ±60s · uptime 99,5% (MVP) → 99,9%. Error budget publicado no status page.

---

## 10. Aprovação

**Decisões desta etapa:**

- [ ] Monólito modular NestJS + Next.js + Flutter (nada de microserviços/K8s no MVP)
- [ ] Postgres + Prisma 7 · Redis/BullMQ · R2 · outbox pattern
- [ ] Vídeo: **LiveKit Cloud** · WhatsApp: Evolution (beta) → **Cloud API oficial** (produção)
- [ ] Pagamentos com **split nativo** (Pagar.me/Mercado Pago) — repasse D+2
- [ ] Receita digital via parceiro ICP-Brasil (Memed/Nexodata/BirdID) — não construir
- [ ] Prontuário append-only + criptografia app-level de dados sensíveis
- [ ] Deploy fase 1 no **Render** (plataforma já dominada), evolução planejada p/ AWS/GCP

Próxima etapa após aprovação: **07 — Segurança & LGPD** (dados sensíveis de saúde, consentimento, auditoria, plano de incidente).
