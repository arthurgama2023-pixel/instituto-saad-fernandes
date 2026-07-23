# Etapa 3 — Fluxos e Jornadas

> Smart Doctor · Documento 3 de 9
> Toda jornada do produto, dos três usuários, com estados de exceção e o fluxo WhatsApp ponta a ponta.
> Convenção: `[tela]` = tela do app · `«msg»` = mensagem da Clara · ◆ = decisão · ⚠ = exceção

---

## 1. Mapa macro do ecossistema

```
                         ┌─────────────────────────┐
                         │        CLARA (IA)       │
                         │  triagem · agenda · $   │
                         └───────────┬─────────────┘
              WhatsApp ▲   App ▲   Site ▲
                       │       │       │
   ┌───────────┐   ┌───┴───────┴───────┴───┐   ┌───────────────┐
   │ PACIENTE  │◄──┤    PLATAFORMA CORE    ├──►│    MÉDICO     │
   │ app/WA/web│   │ agenda·prontuário·pgto│   │  app/web      │
   └───────────┘   └───────────┬───────────┘   └───────────────┘
                               │
                       ┌───────┴────────┐
                       │     ADMIN      │
                       │ web dashboard  │
                       └────────────────┘
```

A Clara é a **camada de entrada universal**: todo caminho do paciente pode começar e terminar numa conversa. App e site são "vistas" do mesmo estado — nunca fontes de verdade paralelas.

---

## 2. Jornada do Paciente

### 2.1 Primeiro contato (3 portas de entrada)

| Porta | Como chega | Primeiro passo |
|---|---|---|
| **WhatsApp** (principal) | anúncio clique-para-WhatsApp, indicação, link do médico | Clara se apresenta, pede nome e consentimento LGPD |
| **App** (App Store / Play) | busca orgânica, ASO, campanha | Onboarding 3 telas → login |
| **Site** | SEO ("cardiologista online"), perfil público do médico | CTA "Falar com a Clara" → abre WhatsApp ou chat web |

### 2.2 Onboarding no app (3 telas, puláveis)

```
[Splash: S-Pulse anima] → [1. "Seu médico a uma mensagem"] → [2. "A Clara cuida de tudo"]
→ [3. "Consulta por vídeo, receita no celular"] → [Login]
```

**Login sem senha:** número de WhatsApp → OTP de 6 dígitos → pronto. (Social login Apple/Google como alternativa — exigência da App Store: se tem social login, Apple Sign-In é obrigatório.) Cadastro completo (CPF, nascimento, convênio) é **progressivo** — só é pedido quando necessário (ex.: CPF na hora de pagar, para a nota).

### 2.3 Fluxo principal: do sintoma à consulta

```
Paciente abre o chat (app ou WhatsApp)
  ↓
«Oi! Sou a Clara 👋 Como posso cuidar de você hoje?»
  ↓
Paciente descreve o problema em linguagem natural
  ↓
CLARA: triagem conversacional (2–4 perguntas, máx.)
  │  · há quanto tempo? · intensidade? · já trata? · preferências (convênio? presencial ou vídeo? região?)
  ↓
◆ Sinal de urgência detectado? ──sim──► ⚠ PROTOCOLO DE URGÊNCIA (§6.3)
  ↓ não
CLARA identifica a ESPECIALIDADE + explica o porquê em 1 frase
  ↓
CLARA busca médicos (filtros: especialidade + convênio/preço + modalidade + horário + avaliação)
  ↓
«Encontrei 3 opções» → DoctorCards com PRÓXIMO HORÁRIO LIVRE em destaque
  ↓
◆ Paciente escolhe médico e horário (quick replies / SlotPicker)
  ↓
CLARA cria reserva temporária do slot (TTL 15 min — trava dupla-marcação)
  ↓
◆ Consulta paga? ──convênio──► valida elegibilidade → confirma
  │              ──particular──► «Link de pagamento: PIX ou cartão» → paga → webhook confirma
  │              ⚠ não pagou em 15 min → slot liberado + «reserva expirou, quer tentar de novo?»
  ↓
✅ CONFIRMADA: «Pronto, consulta marcada ✓» + resumo + botão calendário (.ics)
  ↓
LEMBRETES automáticos:
  · 24h antes: «Confirma presença? (1-Sim / 2-Remarcar)»  ⚠ sem resposta em 4h → segundo toque
  · 15 min antes: push + «Sua sala está pronta: [link]»
  ↓
CONSULTA POR VÍDEO (ou presencial)
  · sala de espera → checagem de câmera/mic → médico entra → consulta (30 min padrão)
  ↓
PÓS-CONSULTA (até 24h)
  · «Sua receita já está disponível 💊» (PDF assinado + QR de validação)
  · atestado, pedidos de exame (se houver)
  · «Como foi sua consulta com a Dra. Camila?» → RatingSheet (1 toque)
  · Clara agenda retorno se o médico indicou («ela pediu retorno em 30 dias — quer que eu já deixe marcado?»)
```

### 2.4 Exceções do paciente

| Situação | Comportamento |
|---|---|
| **Remarcar** | «quero remarcar» → Clara mostra slots do MESMO médico primeiro; grátis até 24h antes; entre 24h–4h cobra política do médico; < 4h = tratado como cancelamento |
| **Cancelar** | confirmação com consequência explícita («reembolso de R$ 180 em até 5 dias») → estorno automático → médico avisado |
| **No-show do paciente** | 10 min de tolerância → status `no_show` → política de reembolso do médico (padrão: sem reembolso) → Clara oferece reagendar |
| **No-show do médico** | 10 min → reembolso INTEGRAL automático + crédito de desculpa + alerta pro admin (3 faltas = suspensão da agenda) |
| **Conexão caiu na consulta** | reconexão automática 2 min → fallback áudio → se perdeu > 1/3 da consulta, paciente pode pedir reagendamento grátis |
| **"Quero falar com gente de verdade"** | Clara transfere para fila de suporte humano SEM discutir — regra de ouro: nunca prender o usuário no bot |
| **Menor de idade** | agendamento exige responsável cadastrado (dependentes no perfil — 1 conta, N dependentes) |

---

## 3. Fluxo WhatsApp ponta a ponta (o coração do produto)

### 3.1 Máquina de estados da conversa

```
IDLE ──msg──► IDENTIFY (novo? conhecido?)
                 │ novo → CONSENT (LGPD, 1 vez só) → PROFILE_MIN (nome)
                 ▼
              INTENT ──◆── agendar → TRIAGE → SPECIALTY → SEARCH → SLOT → PAYMENT → CONFIRMED
                       ├── remarcar/cancelar → MANAGE_APPT
                       ├── dúvida (preço, como funciona) → FAQ
                       ├── receita/resultado → DOCUMENTS
                       ├── urgência → EMERGENCY (§6.3)
                       └── humano → HANDOFF
```

Regras da máquina:
- **Contexto persistente**: a Clara lembra a conversa (janela de 30 dias) — "aquele cardiologista de semana passada" funciona.
- **Interrupção é normal**: usuário pode mudar de assunto no meio; a Clara guarda o fluxo pendente e retoma («voltando à sua consulta…»).
- **Sempre há saída numérica**: toda pergunta aceita resposta livre OU número (acessibilidade + usuários apressados).
- **Timeout de fluxo**: 2h sem resposta em fluxo aberto → Clara salva o estado e pergunta 1 vez «quer continuar de onde paramos?»; depois silêncio (nunca spam).

### 3.2 Conversa de referência (roteiro canônico completo)

```
PACIENTE  Oi
CLARA     Oi! 👋 Sou a Clara, assistente inteligente do Smart Doctor.
          Posso marcar consultas, tirar dúvidas e cuidar da sua agenda de saúde.
          Antes de começar: seus dados são protegidos pela LGPD e usados só
          para seu atendimento. Tudo bem? (1-Aceito · 2-Ler política)
PACIENTE  1
CLARA     Perfeito! Como você se chama?
PACIENTE  Marina
CLARA     Prazer, Marina! 💙 Como posso cuidar de você hoje?
PACIENTE  tô com dor de cabeça há uns 3 dias, piora à tarde
CLARA     Sinto muito pelo incômodo. Só mais duas perguntas rápidas:
          a dor é forte a ponto de atrapalhar seu dia? Já toma algum remédio?
PACIENTE  atrapalha sim, só tomo dipirona mas não resolve
CLARA     Entendi: dor de cabeça há 3 dias, persistente, sem melhora com
          analgésico. Isso é área da *Neurologia*. 🧠
          Você prefere consulta por vídeo ou presencial? Tem convênio?
PACIENTE  vídeo, não tenho convênio
CLARA     Encontrei 3 neurologistas com horário esta semana. A melhor opção:
          *Dra. Camila Reis* ★4.9 · 12 anos de experiência
          📹 Teleconsulta · R$ 180 · Amanhã às 14:30
          1 - Confirmar amanhã 14:30
          2 - Ver outros horários dela
          3 - Ver outros médicos
PACIENTE  1
CLARA     Ótima escolha! Segure comigo: reservei o horário por 15 minutos.
          Para confirmar, é só pagar por aqui:
          💳 PIX (na hora): [código copia-e-cola]
          💳 Cartão: [link seguro]
PACIENTE  [paga o PIX]
CLARA     Pagamento confirmado ✓ Consulta marcada! 🎉
          📅 *Amanhã, ter 15/07, 14:30* — Dra. Camila Reis (Neurologia)
          📹 O link da videochamada chega aqui 15 min antes.
          Te lembro amanhã de manhã. Precisa de mais alguma coisa?
─── 24h antes ───
CLARA     Bom dia, Marina! Lembrete: sua consulta com a Dra. Camila é
          *hoje às 14:30*. Confirma presença? (1-Sim · 2-Remarcar)
PACIENTE  1
─── 15 min antes ───
CLARA     Sua sala está pronta! 🩺 Entre por aqui: [link]
          Dica: teste a câmera antes. Boa consulta!
─── 2h depois ───
CLARA     Marina, sua receita já está disponível 💊 [PDF]
          A Dra. Camila pediu retorno em 30 dias — quer que eu já deixe
          um horário reservado? (1-Sim · 2-Agora não)
          E de 0 a 5, como foi seu atendimento?
```

### 3.3 Regras técnicas do canal

- Identificação por telefone (`User.phone` @unique) — padrão comprovado no agenda-ai.
- Áudio: transcrição automática (Gemini/Whisper), a Clara responde em texto; se o usuário só manda áudio, ela pergunta 1 vez se prefere respostas em áudio (TTS).
- Mensagem fora de contexto de negócio (política, papo) → redireciona com bom humor, 1 linha.
- Anti-abuso: rate limit por número; conteúdo ofensivo → 1 aviso → bloqueio com registro.
- Formatação WhatsApp: `*negrito*`, listas numeradas, zero markdown web. Cards viram texto estruturado + botões de lista nativos (WhatsApp interactive messages) quando a API oficial permitir.

---

## 4. Jornada do Médico

### 4.1 Onboarding (o funil B2B — precisa ser impecável)

```
Landing "Para médicos" → [Criar conta]
  ↓
1. DADOS: nome, e-mail, WhatsApp, CRM + UF, especialidade(s)
  ↓
2. VALIDAÇÃO: upload CRM (foto), diploma/RQE, selfie de verificação
  │   → checagem automática no portal CFM (situação ativa) + revisão do admin em até 24h
  ↓  ⚠ enquanto pendente: acesso ao painel em modo "configuração" (não recebe pacientes)
3. PERFIL PÚBLICO: foto profissional (guia de padrão fotográfico), bio, idiomas,
   convênios, preço, duração da consulta (15/30/45/60), presencial? teleconsulta? cidade
  ↓
4. AGENDA: dias e janelas de atendimento (ex.: seg/qua 8h–12h, ter 14h–20h),
   antecedência mínima (padrão 2h), buffer entre consultas (0/5/10 min), férias/bloqueios
  ↓
5. FINANCEIRO: PIX ou conta bancária (repasse), política de cancelamento
   (padrão da casa ou custom), aceite do contrato de credenciamento
  ↓
✅ APROVADO pelo admin → perfil entra no ar → Clara começa a ofertá-lo
   «Dr. Ricardo, você está no ar! Sua primeira paciente pode chegar a qualquer momento.»
```

### 4.2 Dia a dia do médico

```
[Dashboard] manhã: agenda do dia, próximo paciente, faturamento do mês, avaliação média
  ↓
10 min antes da consulta: notificação + RESUMO DA CLARA no prontuário
  («Marina, 34 anos. Queixa: cefaleia há 3 dias, sem melhora com analgésico.
    1ª consulta. Sem alergias registradas.» — borda Aurora, "Gerado pela Clara")
  ↓
[Sala de vídeo] atende com painel lateral: Prontuário | Receita | Chat
  · escreve evolução (SOAP livre ou estruturado)
  · prescreve na aba Receita (busca de medicamentos + posologia) → assinatura digital
  · emite atestado / pedido de exame no mesmo painel
  ↓
[Encerrar consulta] → marca retorno? (30/60/90 dias — vira gancho para a Clara)
  ↓
Pós: paciente avalia · consulta entra no financeiro (repasse D+2 pós-consulta)
```

### 4.3 Fluxos de gestão do médico

| Fluxo | Comportamento |
|---|---|
| **Bloquear horário** | arrasta na agenda ou fala com a Clara («bloqueia minha sexta à tarde») — sim, o médico também tem a Clara no WhatsApp |
| **Imprevisto hoje** | cancela → Clara reagenda TODOS os pacientes do período automaticamente e reporta o resultado |
| **Encaixe** | paciente pede urgência → Clara oferece aos médicos com "aceito encaixe" ligado |
| **Financeiro** | extrato por consulta: bruto, taxa da plataforma, líquido, status do repasse; exporta CSV; nota fiscal (integração futura) |
| **Reputação** | responde avaliações (resposta pública moderada); avaliação < 3 dispara alerta interno, nunca punição automática |

---

## 5. Jornada do Administrador

### 5.1 Operação diária

```
[Visão Geral] KPIs do dia: consultas hoje · GMV · novos pacientes · funil da Clara
  · fila de aprovação de médicos (SLA 24h)
  · alertas: no-shows de médico, avaliações críticas, conversas escaladas para humano
  ↓
[Médicos] aprovar/rejeitar (checklist CRM/RQE/documentos) · suspender · editar comissão
[Pacientes] busca (LGPD: acesso justificado e logado) · reembolsos manuais · bloqueios
[Clara/IA] painel da IA (§ detalhado na Etapa 5): prompts, temperatura, fluxos,
  taxa de resolução sem humano, conversas para auditar (amostragem)
[Financeiro] repasses do dia · conciliação gateway · taxa média · inadimplência
[Auditoria] trilha imutável: quem viu qual prontuário, quando, por quê
```

### 5.2 Fluxos críticos do admin

| Fluxo | Regra |
|---|---|
| Aprovação de médico | dupla checagem: automática (CFM ativo) + humana (documentos); rejeição sempre com motivo escrito |
| Escalada da Clara | conversa em HANDOFF entra em fila com contexto completo (transcrição + estado) — atendente nunca começa do zero |
| Incidente clínico | relato de erro/dano → congela prontuário (imutável) → fluxo de investigação com registro |
| Reembolso fora de política | exige 2º aprovador acima de R$ X |
| Exportação de dados (LGPD) | pedido do titular → pacote em até 15 dias → registrado em auditoria |

---

## 6. Fluxos transversais

### 6.1 Pagamento

```
CONFIRMAÇÃO DE SLOT ──► gateway (PIX à vista · cartão à vista/2x)
  ↓ webhook `payment.confirmed`
consulta CONFIRMADA → recibo automático
  ↓ consulta CONCLUÍDA (D+2)
SPLIT: repasse ao médico (ex.: 85%) + taxa plataforma (ex.: 15%)
  ⚠ estorno: cancelamento dentro da política → estorno automático total/parcial
  ⚠ chargeback: consulta marcada `em_disputa`, repasse congelado, evidências (logs da sala) anexadas
```

### 6.2 Matriz de notificações (evento × canal)

| Evento | WhatsApp (Clara) | Push | E-mail |
|---|---|---|---|
| Consulta confirmada | ✅ | ✅ | ✅ (recibo) |
| Lembrete 24h | ✅ (interativo) | ✅ | — |
| Lembrete 15 min | ✅ (link da sala) | ✅ | — |
| Receita disponível | ✅ | ✅ | ✅ (PDF) |
| Cancelamento/remarcação | ✅ | ✅ | ✅ |
| Pagamento/estorno | ✅ | — | ✅ |
| Médico: novo agendamento | ✅ | ✅ | — |
| Médico: repasse efetuado | — | ✅ | ✅ |

Regra: o paciente escolhe o canal preferido; WhatsApp é o padrão; nunca duplicar a MESMA mensagem em 3 canais simultâneos (exceto lembrete de consulta).

### 6.3 ⚠ Protocolo de urgência (segurança clínica — inegociável)

Gatilhos (lista mantida com consultoria médica): dor no peito, falta de ar intensa, sinais de AVC (fraqueza súbita, fala enrolada), ideação suicida, sangramento intenso, reação alérgica grave, sintomas graves em bebês…

```
Gatilho detectado
  ↓ (interrompe QUALQUER fluxo, inclusive pagamento)
«⚠ Marina, o que você descreveu pode ser sério.
 Procure um pronto-socorro AGORA ou ligue 192 (SAMU).
 [PS mais próximo do seu endereço: UPA Tijuca — 1,2 km]»
  ↓
NÃO agenda consulta eletiva · registra o episódio no prontuário
  ↓
Follow-up em 12h: «Como você está? Conseguiu atendimento?»
  ↓
Caso de ideação suicida: CVV 188 em destaque + fluxo de acolhimento específico
```

Regra absoluta: **na dúvida, escala**. Falso positivo custa uma mensagem; falso negativo custa uma vida. Toda decisão de urgência é logada para revisão médica semanal.

### 6.4 Ciclo de vida da consulta (máquina de estados canônica)

```
 solicitada ──► aguardando_pagamento ──► confirmada ──► em_andamento ──► concluída
      │                │ (TTL 15min)         │               │
      │                ▼                     ├─► cancelada_paciente
      └──────────► expirada                  ├─► cancelada_medico
                                             ├─► no_show_paciente
                                             └─► no_show_medico
 concluída ──► avaliada        cancelada/no_show ──► reembolsada (quando aplicável)
 qualquer estado pago ──► em_disputa (chargeback)
```

Transições disparam eventos (`appointment.confirmed`, `appointment.completed`…) que alimentam notificações, financeiro e analytics — arquitetura orientada a eventos detalhada na Etapa 6.

---

## 7. Aprovação

**Decisões desta etapa:**

- [ ] Login sem senha (WhatsApp OTP) + cadastro progressivo
- [ ] Reserva de slot com TTL de 15 min condicionada a pagamento
- [ ] Políticas padrão: remarcação grátis até 24h · tolerância 10 min · reembolso integral se médico faltar
- [ ] Médico também usa a Clara (gestão de agenda por WhatsApp)
- [ ] Protocolo de urgência com follow-up em 12h e revisão médica semanal
- [ ] Split de pagamento D+2 pós-consulta (85/15 como hipótese inicial — % final na Etapa 8)

Próxima etapa após aprovação: **04 — Telas e Wireframes** (estrutura tela a tela dos 3 apps + site).
