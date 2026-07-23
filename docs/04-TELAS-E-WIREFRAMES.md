# Etapa 4 — Telas e Wireframes

> Smart Doctor · Documento 4 de 9
> Estrutura tela a tela dos 4 produtos: App do Paciente, Painel do Médico, Painel Admin e Site público.
> Wireframes em texto usando os componentes do Pulse (Etapa 2) e os fluxos da Etapa 3.

---

## 1. Inventário geral

| Produto | Plataforma | Telas | Navegação |
|---|---|---|---|
| **App Paciente** | Flutter (iOS/Android/iPad) + web | 22 telas | Bottom nav 5 itens (FAB Clara central) |
| **Painel Médico** | Web responsivo (+ mesmo app Flutter, modo médico) | 14 telas | Sidebar |
| **Painel Admin** | Web | 12 telas | Sidebar |
| **Site público** | Next.js (SEO) | 8 páginas | Header horizontal |

---

## 2. App do Paciente

### 2.0 Mapa de navegação

```
Splash → Onboarding (3) → Login OTP ──┐
                                      ▼
        ┌─────────── Bottom Nav ────────────────────────────┐
        │ Início │ Agenda │ [✦ Clara] │ Saúde │ Perfil      │
        └────────────────────────────────────────────────────┘
 Início ─► Busca de médicos ─► Perfil do médico ─► Agendar (slots) ─► Pagamento ─► Sucesso
 Agenda ─► Detalhe da consulta ─► Sala de vídeo ─► Avaliação
 Clara  ─► Chat (fluxo completo de agendamento dentro do chat)
 Saúde  ─► Prontuário │ Receitas │ Exames │ Atestados
 Perfil ─► Dados │ Dependentes │ Pagamentos │ Convênio │ Notificações │ Privacidade
```

### 2.1 `[Splash + Onboarding]`

Splash: S-Pulse anima (linha se desenha, spark acende) sobre fundo Branco Clínico.
Onboarding 3 cartões swipe (ilustração linha-contínua + título display + 1 frase), botão "Pular" sempre visível. Último cartão → CTA "Começar".

### 2.2 `[Login]`

```
┌─────────────────────────────┐
│        (logo S-Pulse)       │
│   Que bom te ver por aqui   │
│                             │
│  Seu WhatsApp               │
│  ┌───────────────────────┐  │
│  │ 🇧🇷 +55 │ (21) 9____-___│  │
│  └───────────────────────┘  │
│  [    Receber código     ]  │  ← btn-primary lg
│                             │
│  ───────── ou ─────────     │
│  [  Continuar com Apple  ]  │
│  [ Continuar com Google  ]  │
│  caption: Ao continuar você │
│  aceita os Termos e a       │
│  Política de Privacidade    │
└─────────────────────────────┘
→ [OTP]: 6 caixas, auto-avanço, auto-submit, reenviar em 30s, cola do SMS/WA
```

### 2.3 `[Início]` — a tela mais vista do app

```
┌─────────────────────────────┐
│ Olá, Marina 👋        (🔔)  │  ← header large-title + sino
│                             │
│ ╭───────────────────────╮   │
│ │ ✦ PRÓXIMA CONSULTA    │   │  ← AppointmentCard hero (se houver)
│ │ Amanhã 14:30 · vídeo  │   │     borda destaque, CTA "Entrar na sala"
│ │ Dra. Camila Reis      │   │     (desabilitado até 10 min antes)
│ ╰───────────────────────╯   │
│                             │
│ ╭───────────────────────╮   │
│ │ (✦) Como você está    │   │  ← Card da Clara (aurora-soft)
│ │ hoje? Me conta que eu │   │     input falso → abre o chat
│ │ cuido do resto.       │   │
│ ╰───────────────────────╯   │
│                             │
│ Especialidades              │
│ [❤️ Cardio] [🧠 Neuro] [🧸 Pediatria] [+ ver todas]   ← carrossel de tags
│                             │
│ Continue seu cuidado        │
│ ╭─────────╮ ╭─────────╮     │
│ │Retorno  │ │Receita  │     │  ← cards contextuais (retorno sugerido,
│ │Dra.C 30d│ │disponível│    │     receita nova, exame pendente)
│ ╰─────────╯ ╰─────────╯     │
│                             │
│ ⌂ Início 📅 (✦) ♥ Saúde 👤 │  ← bottom nav, FAB Clara central elevado
└─────────────────────────────┘
Sem consulta marcada → hero vira busca: "O que você está sentindo?" + especialidades.
```

### 2.4 `[Chat da Clara]`

Tela cheia (abre do FAB). Header: avatar Aurora + "Clara · assistente de IA" + status. Corpo: bubbles (spec Pulse §3.5) com cards ricos (DoctorCard, SlotPicker, resumo, botão PIX). Input: texto + 🎤 (segura para gravar, solta para enviar; transcrição aparece antes de enviar). Quick replies contextuais. Banner discreto no 1º uso: "A Clara é uma IA. Ela organiza; quem cuida é sempre um médico."

### 2.5 `[Busca de médicos]`

```
┌─────────────────────────────┐
│ ← Neurologia          (⚙)  │  ← filtros: preço, convênio, modalidade,
│ [🔍 nome, convênio...]      │     cidade, avaliação, "atende hoje"
│ Ordenar: Próximo horário ▾  │  ← default = disponibilidade (não preço!)
│                             │
│ ╭ DoctorCard compacto ╮     │
│ ╭ DoctorCard compacto ╮     │  ← lista infinita, skeleton no load
│ ╭ DoctorCard compacto ╮     │
│                             │
│ ╭───────────────────────╮   │
│ │ ✦ Não sabe qual       │   │  ← escape hatch para a Clara
│ │ escolher? Me descreve │   │
│ │ o que sente que eu    │   │
│ │ encontro pra você.    │   │
│ ╰───────────────────────╯   │
└─────────────────────────────┘
```

### 2.6 `[Perfil do médico]`

Capa aurora-soft → foto grande + nome + especialidade + ★ + CRM (link p/ validação) → chips (preço, duração, modalidades, convênios) → **[Agendar consulta]** sticky no rodapé → bio → formação (acordeão) → avaliações (nota média + distribuição + comentários) → localização (se presencial).

### 2.7 `[Agendar]` — bottom sheet em 3 passos

```
Passo 1 MODALIDADE+DATA: [📹 Vídeo | 🏥 Presencial] + MiniCalendar (pontos verdes)
Passo 2 HORÁRIO: SlotPicker agrupado Manhã/Tarde/Noite
Passo 3 RESUMO: médico + data/hora + valor → "Reservamos por 15:00 min ⏱"
         [ Pagar com PIX ]  [ Cartão ]  (+ convênio se elegível)
→ [Pagamento PIX]: QR + copia-e-cola + contagem TTL + confirmação automática (polling)
→ [Sucesso]: check verde animado + confete discreto + resumo + [Adicionar ao calendário]
   "Te lembro por WhatsApp 💙"
```

### 2.8 `[Agenda]` (tab 2)

Segmented: **Próximas | Passadas**. Lista de AppointmentCards. Passadas têm CTA "Reagendar" e "Ver receita". Empty state: ilustração + "Nenhuma consulta por aqui. Que tal cuidar de você?" [✦ Falar com a Clara].

### 2.9 `[Sala de vídeo]` (spec Pulse §3.6)

Sala de espera → consulta → encerramento → RatingSheet automático. Picture-in-picture ao sair do app (CallKit/ConnectionService — chamada continua).

### 2.10 `[Saúde]` (tab 4) — o cofre do paciente

```
Segmented: Linha do tempo | Receitas | Exames | Documentos
Linha do tempo = RecordTimeline (versão paciente, linguagem simples)
Receitas: PrescriptionCards → PDF, botão "Enviar para farmácia" (v2)
Exames: upload próprio (câmera/arquivo) + pedidos dos médicos + resultados
Topo: card "✦ Resumo da sua saúde" gerado pela Clara (borda Aurora):
"2 consultas este ano · pressão controlada na última medição · retorno com a Dra. Camila em 12 dias"
```

### 2.11 `[Perfil]` (tab 5)

Dados pessoais · Dependentes (adicionar filho/idoso — avatar empilhado) · Formas de pagamento · Convênio (número da carteirinha + foto) · Notificações (canal preferido) · **Privacidade e dados** (consentimentos, baixar meus dados, excluir conta — LGPD self-service) · Ajuda (FAQ + falar com humano) · Sobre/versão.

---

## 3. Painel do Médico (web; sidebar Pulse §4.2)

### 3.1 `[Dashboard]`

```
┌ Sidebar ┬──────────────────────────────────────────────┐
│ ⌂ Dash  │ Bom dia, Dr. Ricardo ☀️        [Hoje ▾] (🔔) │
│ 📅 Agenda│                                              │
│ 👥 Pacien│ ╭KPI╮ ╭KPI╮ ╭KPI╮ ╭KPI╮                      │
│ 📹 Tele  │ │ 8 │ │R$2.4k│ │★4.8│ │92%│                  │
│ 💰 Financ│ │hoje│ │ mês │ │aval│ │ocup│                  │
│ ⚙ Config │ ╰───╯ ╰───╯ ╰───╯ ╰───╯                      │
│          │                                              │
│          │ PRÓXIMO PACIENTE (destaque)                  │
│          │ ╭──────────────────────────────────────╮     │
│          │ │ 14:30 · Marina Costa, 34 · 1ª consulta│    │
│          │ │ ✦ Resumo da Clara: cefaleia há 3 dias…│    │
│          │ │ [Ver prontuário]      [Entrar na sala]│    │
│          │ ╰──────────────────────────────────────╯     │
│          │                                              │
│          │ Agenda de hoje (AgendaDay timeline)  Avisos  │
│          │ 09:00 ▓▓ João · retorno            ⚠ 1 remar-│
│          │ 09:30 ▓▓ Ana · 1ª vez                cação   │
│          │ 10:00 ░░ livre  [+ encaixe]        ★ nova    │
│          │ ...                                 avaliação│
└──────────┴──────────────────────────────────────────────┘
```

### 3.2 `[Agenda]`

Visões Dia/Semana (AgendaWeek). Drag-and-drop para remarcar (toast + Clara avisa o paciente). Clique em slot livre: bloquear / encaixe manual. Botão "Disponibilidade" → editor de janelas semanais + buffer + antecedência + férias.

### 3.3 `[Pacientes]`

Tabela (avatar+nome, última consulta, próxima, tags de condição) + busca. Clique → `[Ficha do paciente]`: cabeçalho (dados + alertas de alergia em vermelho) + RecordTimeline completo + aba de documentos + botão "Mensagem" (chat assíncrono moderado).

### 3.4 `[Consulta ao vivo]` (a tela mais crítica)

```
┌──────────────────────────────┬───────────────────────┐
│                              │ Prontuário│Receita│Chat│  ← abas
│      VÍDEO DO PACIENTE       │ ✦ Resumo da Clara     │
│                              │ ───────────────────── │
│   ┌────┐                     │ S: cefaleia 3d, vesper│
│   │ eu │ (PiP)               │ O: [campos/texto livre]│
│   └────┘                     │ A: ____               │
│                              │ P: ____               │
│ [🎤] [📷] [↺] [💬] [ ⏹ Encerrar ]│ [Salvar evolução]  │
│ 00:12:34                     │ + Receita + Atestado  │
│                              │ + Pedido de exame     │
└──────────────────────────────┴───────────────────────┘
Receita: busca de medicamento (autocomplete ANVISA) → posologia → assinatura
digital (certificado ICP/plataforma) → PDF → paciente recebe na hora.
Encerrar → modal: "Marcar retorno?" (30/60/90/custom) → gancho da Clara.
```

### 3.5 `[Financeiro]`

KPIs (mês bruto/líquido/pendente) + tabela por consulta (paciente, data, bruto, taxa, líquido, status repasse) + extrato de repasses + configurar conta/PIX + política de cancelamento.

### 3.6 `[Configurações]`

Perfil público (preview ao vivo de como o paciente vê) · valores e duração · convênios · notificações · **Clara & eu**: liga/desliga gestão de agenda por WhatsApp, tom dos resumos.

---

## 4. Painel Admin

### 4.1 `[Visão Geral]`

KPI row: GMV dia/mês · consultas hoje · taxa de conclusão · novos pacientes · **funil da Clara** (mensagens → triagens → agendamentos → realizadas, gráfico de funil). Fila de aprovações (SLA badge) · alertas operacionais · gráfico de consultas por especialidade.

### 4.2 `[Médicos]`

Tabs: **Aprovação pendente** (checklist CRM/RQE/documentos com viewer lado a lado, aprovar/rejeitar com motivo) | **Ativos** (tabela: produção, avaliação, taxa de no-show, comissão custom) | **Suspensos**. Ações logadas em auditoria.

### 4.3 `[Pacientes]`

Busca com justificativa obrigatória (LGPD — motivo vai pro log). Ficha: consultas, pagamentos, dispositivos, consentimentos. Ações: reembolso manual (2º aprovador > R$ X), bloqueio, exportar dados do titular, anonimizar (exclusão LGPD).

### 4.4 `[Especialidades]`

CRUD: nome, ícone, cor pastel, sinônimos/keywords para a triagem da Clara ("dor de cabeça→Neurologia"), preço de referência, duração padrão, flag "urgência frequente".

### 4.5 `[Clara — IA]` (detalhado na Etapa 5)

Dashboard da IA: taxa de resolução sem humano, tempo médio até agendamento, custo por conversa · editor de prompts com versões e rollback · parâmetros (modelo, temperatura, max tokens) · fluxos on/off · playground de teste · amostra de conversas para auditoria (anonimizadas) · gatilhos de urgência (lista editável com aprovação médica).

### 4.6 `[Financeiro]` `[Relatórios]` `[Auditoria]` `[Permissões]`

- Financeiro: conciliação gateway × banco, repasses do dia (aprovar lote), taxas, inadimplência, disputa/chargeback.
- Relatórios: exportáveis (CSV/PDF) — produção por médico, receita por especialidade, coortes de retenção, NPS.
- Auditoria: trilha imutável filtrável (quem, o quê, quando, IP) — inclui acessos a prontuário e mudanças de prompt da Clara.
- Permissões: papéis (superadmin, operação, financeiro, clínico, suporte) — princípio do menor privilégio.

---

## 5. Site público (Next.js — SEO é canal de aquisição)

| Página | Objetivo | Estrutura |
|---|---|---|
| **Home** | conversão paciente | Hero "Seu médico a uma mensagem" + demo do chat animada + como funciona (3 passos) + especialidades + depoimentos + CTA WhatsApp |
| **/especialidade/[slug]** | SEO ("cardiologista online") | conteúdo + médicos da especialidade + CTA Clara |
| **/medico/[slug]** | perfil público indexável | espelho do perfil in-app + agendar (deep link) |
| **/para-medicos** | funil B2B | proposta de valor (agenda cheia, sem secretária, repasse D+2) + calculadora de ganhos + cadastro |
| **/precos** | transparência | consulta particular por especialidade + como funciona convênio |
| **/blog** | SEO educativo | artigos de saúde revisados por médicos (E-E-A-T) |
| **/privacidade /termos** | LGPD/lojas | políticas |
| **/ajuda** | suporte | FAQ + status + contato |

---

## 6. Estados obrigatórios por tela (checklist de QA)

Toda tela deve especificar: **loading** (skeleton na geometria real) · **vazio** (ilustração + 1 frase + CTA) · **erro** (o que houve + como resolver + tentar de novo) · **offline** (banner + cache do essencial: agenda e receitas ficam disponíveis offline) · **sem permissão** (câmera/mic negados → instrução de como habilitar).

---

## 7. Aprovação

**Decisões desta etapa:**

- [ ] App único Flutter com "modo médico" (login decide a experiência) — em vez de 2 apps separados nas lojas
- [ ] Início do paciente centrado em "próxima consulta + card da Clara" (não em busca)
- [ ] Ordenação padrão da busca por **próximo horário livre** (não por preço)
- [ ] Consulta ao vivo do médico com painel lateral Prontuário|Receita|Chat (SOAP)
- [ ] Busca de pacientes no admin exige justificativa logada (LGPD by design)
- [ ] Agenda e receitas disponíveis offline no app

Próxima etapa após aprovação: **05 — Inteligência Artificial** (arquitetura da Clara, ferramentas/function calling, prompts, painel admin da IA, guardrails).
