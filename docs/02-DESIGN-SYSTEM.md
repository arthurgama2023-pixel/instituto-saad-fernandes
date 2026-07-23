# Etapa 2 — Design System "Pulse"

> Smart Doctor · Documento 2 de 9
> O design system do Smart Doctor se chama **Pulse** (referência à logo S-Pulse).
> Ele cobre web (Next.js) e mobile (Flutter) com os mesmos tokens.

---

## 1. Fundações (Design Tokens)

### 1.1 Cores

Tokens semânticos (nunca usar hex direto em componente):

```
--sd-bg              #FBFCFE   (dark: #0B1220)
--sd-surface         #FFFFFF   (dark: #131C2E)
--sd-surface-2       #F1F4F9   (dark: #1A2438)
--sd-border          #E3E8F0   (dark: #243044)
--sd-text            #101828   (dark: #E6EBF4)
--sd-text-2          #4A5568   (dark: #9AA6BC)
--sd-text-3          #8A94A6   (dark: #64748B)
--sd-primary         #0B6EF5   (dark: #3D8BFF)
--sd-primary-deep    #0A2A5E   (dark: #B9D4FF em texto)
--sd-accent          #00C9A7   (dark: #1FDDBE)
--sd-success         #12B76A
--sd-warning         #F79009
--sd-danger          #F04438
--sd-aurora          linear-gradient(135deg, #0B6EF5 0%, #00C9A7 100%)
--sd-aurora-soft     linear-gradient(135deg, rgba(11,110,245,.08), rgba(0,201,167,.08))
```

### 1.2 Espaçamento — grid de 4pt

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`
Padding interno padrão de card: **20px**. Margem entre cards: **16px**. Padding lateral de tela mobile: **20px**.

### 1.3 Raios

| Token | Valor | Uso |
|---|---|---|
| `r-sm` | 8px | Badges, tags, inputs pequenos |
| `r-md` | 12px | Botões, inputs |
| `r-lg` | 16px | Cards |
| `r-xl` | 20px | Cards hero, modais |
| `r-full` | 999px | Avatares, pills, FAB |

### 1.4 Sombras (elevação em 2 camadas)

| Nível | Valor | Uso |
|---|---|---|
| `e-1` | `0 1px 2px rgba(16,24,40,.05)` | Inputs, cards em repouso |
| `e-2` | `0 1px 2px rgba(16,24,40,.05), 0 8px 24px rgba(16,24,40,.06)` | Cards interativos, dropdowns |
| `e-3` | `0 4px 8px rgba(16,24,40,.06), 0 20px 48px rgba(16,24,40,.12)` | Modais, FAB da Clara |

No dark mode, sombras são substituídas por bordas `--sd-border` + brilho sutil.

### 1.5 Motion

| Token | Valor | Uso |
|---|---|---|
| `fast` | 150ms ease-out | Hover, toggles |
| `base` | 250ms cubic-bezier(.2,.8,.2,1) | Transições de tela, modais |
| `spring` | 400ms spring(1, 80, 12) | Bottom sheets, confirmação de consulta |
| `clara-pulse` | 1.2s ease-in-out infinite | Spark da Clara "pensando" |

Regra: nada anima mais de 400ms. `prefers-reduced-motion` desliga tudo exceto opacidade.

### 1.6 Breakpoints e grid

| Nome | Largura | Layout |
|---|---|---|
| mobile | < 640 | 1 coluna, bottom nav |
| tablet | 640–1024 | 2 colunas, sidebar colapsada |
| desktop | > 1024 | sidebar fixa 260px + conteúdo max 1200px |

### 1.7 Z-index

`base 0 · sticky 10 · dropdown 30 · overlay 40 · modal 50 · toast 60 · clara-fab 45`

---

## 2. Componentes Base

### 2.1 Botões

| Variante | Visual | Uso |
|---|---|---|
| **Primary** | fundo `--sd-primary`, texto branco | 1 por tela, ação principal ("Confirmar consulta") |
| **Aurora** | fundo gradiente Aurora | EXCLUSIVO de ações da Clara ("Falar com a Clara") |
| **Secondary** | fundo `--sd-surface-2`, texto `--sd-text` | Ações de apoio |
| **Outline** | borda `--sd-border`, fundo transparente | Filtros, "Ver mais" |
| **Ghost** | só texto colorido | Ações em cards, links de rodapé |
| **Danger** | texto/borda `--sd-danger`; fundo vermelho SÓ em confirmação final | Cancelar consulta |

Tamanhos: `sm 32px · md 44px · lg 52px` de altura (44px+ em mobile — área de toque Apple HIG). Raio `r-md`. Label em `label` (13/18 Medium), ícone opcional 20px à esquerda.
Estados: default, hover (escurece 6%), pressed (escurece 10% + scale .98), **loading** (spinner substitui o label, largura travada), disabled (40% opacidade). Botão primário disabled **nunca some** — mostra por que está travado via tooltip/hint.

### 2.2 Inputs

Base: altura 48px, raio `r-md`, borda `--sd-border`, fundo `--sd-surface`, foco = borda `--sd-primary` + anel 3px `rgba(11,110,245,.15)`. Label sempre visível ACIMA do campo (nunca placeholder-como-label). Erro: borda `--sd-danger` + mensagem 12px abaixo + ícone.

Variantes: texto, e-mail, senha (olho), **telefone com máscara BR** `(21) 98082-8309`, busca (lupa + limpar), textarea auto-grow, select (menu custom), **OTP de 6 dígitos** (verificação WhatsApp), data (abre calendário), **upload de documento** (arrastar/CRM/foto — usado no onboarding médico), moeda `R$ 0,00`.

### 2.3 Avatar

Círculo (`r-full`). Tamanhos: `xs 24 · sm 32 · md 40 · lg 56 · xl 96` px.
- **Médico:** foto obrigatória; anel de status na borda (verde = online/teleconsulta disponível, cinza = offline). Fallback: iniciais sobre pastel da especialidade.
- **Paciente:** foto opcional; fallback iniciais sobre `--sd-surface-2`.
- **Clara:** SEMPRE o símbolo S-Pulse branco sobre gradiente Aurora — nunca foto humana.

### 2.4 Badges e Tags

- **Badge de status** (pill, 12px Medium): `Confirmada` verde · `Aguardando pagamento` âmbar · `Cancelada` vermelho · `Concluída` cinza · `Em andamento` azul pulsante · `Teleconsulta` azul + ícone vídeo · `Presencial` roxo + ícone pin.
- **Badge numérico**: círculo vermelho 18px em ícones de notificação (máx "9+").
- **Tag de especialidade**: pill com pastel + ícone da especialidade (Cardiologia ❤️ rosa, Pediatria 🧸 âmbar, Neuro 🧠 lilás…). Clicável = filtro.
- **Badge "Gerado pela Clara"**: pill com fundo `--sd-aurora-soft`, spark 12px + texto — obrigatório em todo conteúdo de IA.

### 2.5 Toggles, checkbox, radio, chips

Toggle iOS-style 51×31 (verde vital quando ativo). Checkbox 20px raio 6. Radio 20px. Chips de seleção rápida (ex.: convênios) — outline que vira preenchido azul-claro ao selecionar.

---

## 3. Componentes de Saúde (o coração do Pulse)

### 3.1 Card do Médico (`DoctorCard`)

O componente mais importante do produto. Duas densidades:

**Compacto (lista de busca / sugestão da Clara no app):**
```
┌────────────────────────────────────────────┐
│ (foto 56px)  Dra. Camila Reis         ★4.9 │
│  ● online    Neurologia · CRM 52-12345     │
│              💼 12 anos · 🗣 PT/EN          │
│  ┌─────────┐ ┌─────────┐ ┌──────────────┐  │
│  │ R$ 180  │ │ 📹 vídeo │ │ Amanhã 14:30 │  │
│  └─────────┘ └─────────┘ └──────────────┘  │
│  [ Ver perfil ]        [ Agendar agora ]   │
└────────────────────────────────────────────┘
```
Foto + anel de status, nome `headline`, especialidade + CRM `caption`, avaliação com estrela, chips de preço/modalidade/**próximo horário livre** (o dado que converte), CTA primário "Agendar agora".

**Perfil completo:** header com foto grande + capa em `--sd-aurora-soft`, bio, currículo em acordeão, convênios (chips), avaliações (lista), seletor de agenda embutido (ver 3.3).

### 3.2 Card do Paciente (`PatientCard`) — visão do médico

Avatar + nome + idade + convênio, última consulta, tags de condições (ex.: `hipertenso`, `alérgico a dipirona` — vermelho), botão "Prontuário". Variante linha-de-tabela para listas grandes.

### 3.3 Calendário e Agenda

- **`MiniCalendar`** (seleção de data): mês em grade 7×5, dias com disponibilidade têm ponto verde; dia selecionado = círculo azul cheio; hoje = contorno.
- **`SlotPicker`** (horários): chips de horário em grade (`09:00`, `09:30`…), agrupados por período (Manhã ☀️ / Tarde 🌤 / Noite 🌙). Ocupado = cinza riscado; selecionado = azul.
- **`AgendaDay`** (visão do médico): timeline vertical com blocos proporcionais à duração; cor do bloco = pastel da especialidade/tipo; bloco de teleconsulta tem ícone 📹; buracos livres mostram "+ encaixe" fantasma; linha "agora" em vermelho fino.
- **`AgendaWeek`** (médico/admin): grade 7 colunas, mesmo vocabulário visual.
- Drag-and-drop para remarcar (web) com toast de confirmação + aviso automático da Clara ao paciente.

### 3.4 Card de Consulta (`AppointmentCard`)

Usado no app do paciente (próximas consultas) e dashboards:
```
┌──────────────────────────────────────────┐
│ QUINTA · 15 JUL · 14:30      [Confirmada]│
│ (foto) Dra. Camila Reis                  │
│        Neurologia · Teleconsulta 📹      │
│ ⏱ em 22 horas                            │
│ [ Entrar na sala ]  [ Remarcar ]  [ ⋯ ]  │
└──────────────────────────────────────────┘
```
"Entrar na sala" só ativa 10 min antes (até lá, outline desabilitado com contagem). Menu ⋯: cancelar, adicionar ao calendário, recibo, falar com a Clara.

### 3.5 Chat (paciente ↔ Clara, paciente ↔ médico)

- Balões: usuário = azul `--sd-primary` texto branco, à direita; **Clara = fundo branco com borda em gradiente Aurora**, avatar S-Pulse, à esquerda; médico = fundo `--sd-surface-2`, avatar com foto.
- Raio 18px com "cauda" reta no canto de origem. Timestamp `caption` discreto agrupado por bloco.
- **Quick replies**: chips horizontais sob a última mensagem da Clara ("Confirmar ✓", "Ver outros médicos", "Outro horário").
- **Cards ricos no chat**: a Clara envia `DoctorCard` compacto, `SlotPicker` inline e resumo de agendamento DENTRO do chat (no WhatsApp viram texto formatado + listas nativas).
- Typing: 3 pontos pulsando em Aurora quando a Clara "pensa".
- Áudio: player com forma de onda; transcrição automática expandível ("ver texto").

### 3.6 Videochamada (`ConsultRoom`)

- Vídeo do médico em tela cheia; paciente em picture-in-picture arrastável (120×160, raio 16).
- Barra inferior flutuante translúcida (blur): mic, câmera, virar câmera, chat, encerrar (vermelho, isolado à direita).
- Estados: sala de espera ("A Dra. Camila chegará em instantes" + checagem de câmera/mic + animação Clara), conexão ruim (banner âmbar + fallback para áudio), consulta encerrada → tela de avaliação.
- Lado médico (web): vídeo à esquerda, painel lateral com abas **Prontuário | Receita | Chat** — o médico prescreve sem sair da chamada.
- Timer discreto no topo. Gravação (se consentida) = ponto vermelho + label "Gravando com consentimento".

### 3.7 Prontuário (`RecordTimeline`)

Timeline vertical (mais recente no topo). Cada entrada é um card com ícone por tipo:
`🩺 Consulta · 💊 Receita · 🧪 Exame · 📄 Atestado · 📝 Anotação · ✨ Resumo da Clara`
Entrada de consulta: data, médico, CID (visível só para médico), queixa, conduta, anexos.
**Resumo da Clara**: card com borda Aurora + badge "Gerado pela Clara" — resumo do histórico para o médico ler em 30s antes da consulta. Filtros por tipo e período. Para o paciente: linguagem simplificada, sem CID cru.

### 3.8 Receita / Atestado (`PrescriptionCard`)

Card formal: logo mono, nome/CRM/assinatura digital do médico, medicamentos em lista numerada com posologia destacada, QR code de validação, botões "Baixar PDF" e "Enviar no WhatsApp". Visual de documento (fundo branco puro, serifa opcional no PDF) — deve inspirar validade legal.

### 3.9 Avaliação (`RatingSheet`)

Bottom sheet pós-consulta: 5 estrelas grandes (44px), chips de elogio ("Pontual", "Atencioso", "Explicou bem"), comentário opcional. Uma tela só, dispensável em 2 toques.

---

## 4. Navegação

### 4.1 Bottom Navigation (app do paciente) — 5 itens

`Início · Agenda · [ ✦ Clara ] · Saúde · Perfil`
O item central é o **FAB da Clara**: círculo 56px em gradiente Aurora, elevado 8px acima da barra — a IA é literalmente o centro do produto. Ícones outline → filled quando ativos. Barra translúcida com blur, borda superior hairline.

### 4.2 Sidebar (médico e admin — web)

260px fixa (colapsa para 72px só-ícones). Topo: logo. Meio: itens com ícone 20px + label, item ativo = fundo `--sd-aurora-soft` + barra 3px azul à esquerda. Base: card do usuário + status online + sair.
Médico: `Dashboard · Agenda · Pacientes · Teleconsulta · Financeiro · Configurações`
Admin: `Visão Geral · Médicos · Pacientes · Especialidades · Clara (IA) · Financeiro · Relatórios · Auditoria · Configurações`

### 4.3 Header

Web: breadcrumb à esquerda; busca global (⌘K) central; à direita sino de notificações + avatar. Mobile: título da tela + ação contextual; grande no topo de scroll (estilo iOS large title) encolhendo ao rolar.

---

## 5. Feedback e Overlays

### 5.1 Modais e Sheets

- Desktop: modal central 480–640px, raio `r-xl`, overlay `rgba(10,16,32,.5)` + blur 4px.
- Mobile: **bottom sheet** com alça de arrasto (regra: mobile nunca usa modal central, sempre sheet).
- Confirmação destrutiva (cancelar consulta): ícone âmbar, consequência explícita ("A Dra. Camila será avisada. Reembolso em até 5 dias."), botão destrutivo à direita, "Voltar" sempre à esquerda.

### 5.2 Alertas e Toasts

Toast: canto superior direito (web) / topo (mobile), auto-dismiss 4s, ícone semântico + mensagem + ação opcional ("Desfazer"). Banner persistente para avisos de sistema (ex.: "Sua consulta começa em 15 min — [Entrar]" fixo no topo do app, em Aurora suave).

### 5.3 Notificações (push/WhatsApp) — templates

| Evento | Canal | Mensagem |
|---|---|---|
| Consulta confirmada | push + WA | "✓ Confirmado: Dra. Camila, qui 15/07 às 14:30. Toque para ver." |
| Lembrete 24h | WA (Clara) | "Oi, Marina! Sua consulta com a Dra. Camila é amanhã às 14:30. Confirma presença? (1-Sim / 2-Remarcar)" |
| Lembrete 15min | push | "Sua teleconsulta começa em 15 min. [Entrar na sala]" |
| Receita disponível | push + WA | "💊 Sua receita já está disponível. Toque para baixar." |
| Pagamento | WA (Clara) | link PIX/cartão + confirmação automática |

### 5.4 Empty states e Skeletons

Empty state: ilustração linha-contínua + 1 frase + 1 CTA (ex.: agenda vazia → "Nenhuma consulta por aqui. Que tal cuidar de você?" [Falar com a Clara]). Skeleton: blocos `--sd-surface-2` pulsando na MESMA geometria do conteúdo real (sem spinner de página inteira, nunca).

---

## 6. Dados: Tabelas, Gráficos e Widgets

### 6.1 Tabelas (admin/médico)

Header sticky `caption` uppercase cinza; linhas 56px com hover; zebra OFF (bordas hairline). Colunas: avatar+nome, badges de status, valores tabulares à direita. Ações por linha em menu ⋯. Seleção múltipla com barra de ações flutuante. Paginação "1–20 de 340" + filtros salvos. Mobile: tabela vira lista de cards.

### 6.2 KPI Tiles (widgets de dashboard)

Card `r-lg` com: label `caption`, valor `display` tabular, delta com seta (verde/vermelho) + "vs. mês anterior", sparkline discreta. Grid 4 col desktop / 2 tablet / 1 mobile.

### 6.3 Gráficos (regras — detalhes visuais na implementação)

- Linha: consultas/receita no tempo (área com gradiente 8% sob a linha).
- Barras: consultas por especialidade (pastéis das especialidades).
- Donut: teleconsulta × presencial; taxa de ocupação da agenda.
- **Funil da Clara** (admin): mensagens → triagens → agendamentos → consultas realizadas — o gráfico mais importante do negócio.
- Sem 3D, sem mais de 6 séries, tooltips consistentes, eixos `caption` cinza.

---

## 7. Acessibilidade e Qualidade

1. Contraste AA em tudo; AAA em ações críticas e conteúdo clínico.
2. Área de toque mínima 44×44.
3. Todo componente navegável por teclado (web) e legível por VoiceOver/TalkBack — labels em PT-BR nos ícones.
4. Fontes escalam com o sistema (Dynamic Type / sp) até 130% sem quebra de layout.
5. Estados de foco visíveis (anel azul) — nunca `outline: none` sem substituto.
6. Texto real, nunca texto em imagem.
7. Idioma: PT-BR nativo; arquitetura de strings pronta para ES/EN (i18n desde o dia 1).

---

## 8. Implementação de referência

| Camada | Ferramenta |
|---|---|
| Web | **shadcn/ui + Tailwind** com os tokens Pulse (CSS vars acima) — mesma base comprovada nos projetos anteriores |
| Mobile | **Flutter** com `ThemeExtension` espelhando os tokens (1 arquivo `pulse_theme.dart`) |
| Ícones | Lucide (web) / lucide_flutter + set próprio de saúde em SVG |
| Gráficos | Recharts (web) / fl_chart (Flutter) |
| Fonte da verdade | `smart-doctor/design/tokens.json` → gera CSS vars e Dart (style-dictionary) |

---

## 9. Aprovação

**Decisões desta etapa:**

- [ ] Nome do design system: **Pulse**
- [ ] FAB central da Clara na bottom nav (a IA como centro físico do app)
- [ ] Balões da Clara com borda Aurora + badge obrigatório "Gerado pela Clara"
- [ ] Mobile usa bottom sheets (nunca modal central)
- [ ] Tokens via `tokens.json` compartilhado web+Flutter

Próxima etapa após aprovação: **03 — Fluxos e Jornadas completas** (paciente, médico, admin + fluxo WhatsApp ponta a ponta).
