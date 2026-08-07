# Histórico de Testes — Smart Doctor

Regra: teste ✅ numa entrada e ❌ na seguinte = REGRESSÃO (algo antigo quebrou).

> ⚠️ Este projeto ainda **não tem runner de teste** (nem vitest, jest, playwright
> ou cypress no `package.json`). Até isso mudar, a verificação possível é
> `npx tsc --noEmit` + conferência no navegador; as entradas abaixo registram isso
> em vez de contagem de testes. Ver `mapa-cobertura.md`.

---
## 2026-08-07 — Fundação do login (Supabase Auth telefone/OTP) provada
- Decisão de arquitetura revista com o dono: virar pro **Supabase nativo**
  (Supabase Auth + supabase-js + RLS via auth.uid) em vez de Prisma+withUser —
  "seguro por padrão" pesa mais no longo prazo pra dado médico. A reescrita da
  camada de dados espera a ICP do amigo ser mesclada (colisão alta); só as
  partes de baixa colisão avançam agora.
- Config do Supabase Auth (via Management API): `external_phone_enabled=true`,
  `sms_autoconfirm=true`, e um número de TESTE com código fixo
  (`5511988887777` = `123456`, válido até 2030) — sem provedor de SMS real,
  sem custo. Provedor pago (Twilio/WhatsApp) fica pra produção.
- Prova end-to-end do fluxo (POST /auth/v1/otp → /auth/v1/verify com a anon
  key): login OK, sessão criada, JWT com `role=authenticated` e `sub`
  (auth.uid) — exatamente o que o RLS nativo consome. Ficou 1 usuário de teste
  em auth.users (o número de teste), útil pra construir a tela de login depois.
- NOTA sobre o rls.sql já commitado: ele prova o mecanismo, mas keya em
  `current_setting('app.uid')` (abordagem Prisma+withUser). Na virada nativa,
  as políticas passam a keyar em `auth.uid()`. O mecanismo é o mesmo; muda a
  fonte da identidade. Ajuste entra no wiring nativo (pós-ICP do amigo).
- Sem mudança de código do app neste passo (config Supabase + verificação).
- Branch: `feat/smart-doctor/auth-supabase`

---
## 2026-08-07 — Supabase Fase 0 + fundação de RLS (auth-supabase)
- Testes: **sem suíte** · verificação por scripts diretos contra o Supabase.
- Fase 0: criado projeto Supabase do cliente (org "Smart Doctor", região
  sa-east-1, Postgres 17). `prisma db push` aplicou o schema → 11 tabelas.
  Conexão direta (5432) e pooler (6543) testadas: ambas OK com o driver `pg`.
  Credenciais no `.env.local` (gitignored). Dev local segue SQLite, git limpo.
- **Pegadinha crítica confirmada e resolvida**: o papel `postgres` (que o
  Prisma usa) tem `bypassrls = true` — conectar como ele NÃO isola nada. A
  correção provada: por requisição, `SET LOCAL ROLE authenticated` +
  `set_config('app.uid', <User.id>, true)`; o papel `authenticated` obedece
  RLS. Testado através do POOLER (transaction mode): alice só vê alice, bob só
  vê bob, sem identidade não vê nada.
- **RLS aplicado na tabela real `Appointment`** (`prisma/rls.sql`, versionado e
  idempotente). Prova com dados reais (2 pacientes + 1 médico, depois removidos):
  - Paciente A → só a consulta dele (incl. o prontuário dele)
  - Paciente B → só a dele
  - Médico → ambas (é o médico das duas)
  - Sem login → nada
  Estado final: RLS ligado na Appointment, política `appointment_select`,
  0 linhas de teste no banco.
- Ainda NÃO ligado ao app: o app roda em SQLite/demo; a Fase 1 (login real +
  helper `withUser` + wiring Supabase) é o próximo passo. `rls.sql` cobre só
  Appointment/SELECT por enquanto (marcado no cabeçalho do arquivo).
- Branch: `feat/smart-doctor/auth-supabase`

---
## 2026-08-06 — Aba "Urgência" no painel do médico
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Toda a lógica já existia (schema `UrgencyRequest`, `modules/urgency/service.ts`,
  APIs `/api/urgencia/*` e `/api/medico/urgencias/*`, componente `UrgencyInbox`) —
  só faltava expor como aba própria em `/medico`. `UrgencyInbox` só estava
  embutido dentro da aba Dashboard, invisível quando a fila está vazia.
- Mudança: +`["urgencia", "emergency", "Urgência"]` no `NAV` e no `tabTitle` de
  `src/app/medico/page.tsx`; `UrgencyInbox` ganhou a prop `standalone` — quando
  true, mostra estado vazio em vez de `return null` (fazia sentido ficar
  invisível dentro do dashboard, mas não como aba dedicada em branco).
  Mantive o inbox também no dashboard (alerta imediato) — a aba nova é pra
  quando o médico for checar de propósito.
- Verificação end-to-end real (não é mock, é o fluxo de produção completo):
  1. `/medico?tab=urgencia` sem chamado → estado vazio correto.
  2. Abri `/paciente/urgencia`, escolhi Tricologia, descrevi "queda de cabelo
     intensa", cliquei "CHAMAR MÉDICO AGORA" → chamado criado, tela de
     "Procurando médico…" com contagem regressiva.
  3. Voltei pra `/medico?tab=urgencia` (mesmo médico, Tricologia) → o chamado
     da Marina Costa apareceu, com descrição e tempo de espera.
  4. Cliquei "Aceitar" → "Chamado aceito. O paciente está confirmando o
     pagamento." — fila esvaziou.
- Regressões: nenhuma (dashboard, agenda, pacientes, financeiro, config
  continuam navegáveis).
- Branch: `feat/smart-doctor/assinatura-icp-receituario`

---
## 2026-08-06 — Texto de validade jurídica (ICP-Brasil) na interface
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Só copy, dois pontos: (A) ao marcar "Receituário especial", frase nova com
  ícone gavel explicando que a assinatura ICP-Brasil equivale a assinatura de
  próprio punho (MP 2.200-2/2001) — antes de decidir; (B) no selo pós-assinatura
  (médico e paciente), a citação formal completa da MP fecha o documento.
- Verificação ao vivo (dev 3080):
  - Momento A: marquei o checkbox → confirmei via read_page/JS que a frase de
    validade jurídica + MP 2.200-2/2001 renderiza junto ao aviso de bloqueio,
    e o botão vira "ENVIAR PARA ASSINATURA".
  - Momento B: marquei manualmente 1 consulta como ASSINADO no banco (só pra
    exercitar o render do selo verde — NÃO é assinatura real) e confirmei a
    citação da MP no selo, tanto em /medico/pacientes/[id] quanto em
    /paciente/consultas/[id].
- Gotcha reconfirmado: o dev server entrou em loop de HMR quebrado (WebSocket
  502/409) e a página não hidratava — o checkbox não respondia a clique. Um
  restart do server + reload resolveu. Já documentado como padrão deste projeto.
- Regressões: nenhuma.
- Branch: `feat/smart-doctor/assinatura-icp-receituario`

---
## 2026-08-06 — CPF no cadastro do médico, fecha o gap do Clicksign
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Fecha a dívida registrada na entrega anterior: `Doctor.cpf` (opcional, mesma
  filosofia "nada obrigatório" do resto do cadastro) + campo no formulário
  + os 4 médicos do seed ganharam CPF de teste (dígito válido, não pertence a
  ninguém). `criarSignatario` no Clicksign agora usa `appt.doctor.cpf` de
  verdade — removi o `CPF_TESTE_SANDBOX` hardcoded.
- Verificação end-to-end real: mandei um novo receituário especial pra
  assinatura (paciente diferente do teste anterior) e confirmei DIRETO na
  API do Clicksign (`GET /signers/{id}`) que o campo `documentation` do
  signatário veio com o CPF do cadastro (`111.444.777-35`, do Dr. Saad
  Fernandes), não mais o valor fixo do código.
- Também gerei o PDF de exemplo do receituário (mesmo código, `pdf-lib`) e
  entreguei pro dono — é o conteúdo que vai pro Clicksign antes da
  assinatura; não tem assinatura ICP-Brasil aplicada (isso só existe de
  verdade depois que o médico assina lá, fora do nosso app).
- Regressões: nenhuma.
- Branch: `feat/smart-doctor/assinatura-icp-receituario`

---
## 2026-08-06 — Download do receituário assinado (Clicksign)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Descoberta ao vivo: o link de download do documento assinado
  (`data.links.files.signed`, no GET de um documento) é uma URL pré-assinada
  da AWS S3 que expira em ~5 minutos — por isso NÃO fica salva no banco.
  `src/lib/clicksign.ts#buscarArquivoAssinado` busca fresca a cada pedido.
- GET /api/paciente/receituario/[appointmentId]: valida que a consulta é do
  paciente logado e que `assinaturaIcpStatus === "ASSINADO"` antes de buscar
  o link e redirecionar (307). Sem isso, 409 com mensagem clara.
- Botão de download aparece em duas telas do paciente, só quando assinado:
  `/paciente/consultas/[id]` (botão) e `/paciente/exames` (badge ASSINADA
  virou link).
- Verificação ao vivo: acessei a rota direto pra uma consulta ainda
  "AGUARDANDO_ASSINATURA" → bloqueou corretamente com 409 e mensagem
  ("Este receituário ainda não foi assinado"). Não deu pra testar o caminho
  feliz (download de verdade) pelo mesmo motivo já registrado: ninguém tem
  certificado ICP-Brasil real pra completar uma assinatura no sandbox.
- Regressões: nenhuma (páginas do paciente renderizam normal, sem crash, com
  o registro ainda "aguardando").
- Branch: `feat/smart-doctor/assinatura-icp-receituario`

---
## 2026-08-06 — Assinatura digital ICP-Brasil no receituário especial (REAL, via Clicksign)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Substitui a versão simulada (entrada anterior) por integração real com a API
  v3 do Clicksign. Migração: troca `assinaturaIcpSerial` (mock) por
  `assinaturaIcpStatus` + `assinaturaIcpEnvelopeId` + `assinaturaIcpDocumentId`
  + `assinaturaIcpSignerId` no model `Appointment` — fluxo agora é assíncrono
  (ASSINADO só quando o webhook do Clicksign confirmar).
- Duas dependências trocadas em runtime: `pdfkit` quebrava em produção porque
  lê `Helvetica.afm` do disco em tempo de execução e o Turbopack não inclui
  esse arquivo no bundle do servidor (`ENOENT`) — troquei por `pdf-lib`
  (puro JS, sem I/O de arquivo externo).
- Descobertas da API real (não documentadas claramente nos docs públicos,
  confirmadas testando contra o sandbox):
  - Auth é `?access_token=` na query string, não `Authorization: Bearer`.
  - `content_base64` no upload de documento precisa ser um data URI
    (`data:application/pdf;base64,...`), não base64 puro.
  - Exigir `auth: icp_brasil` num requirement obriga o signatário a ter
    `has_documentation: true` + CPF válido — o Clicksign confere o
    certificado contra o CPF do titular.
- **Gap de produto registrado**: o cadastro do médico não coleta CPF (só CRM).
  Usei um CPF de teste de dígito válido só pra provar o fluxo no sandbox —
  em produção isso precisa vir de um campo real no cadastro. Ver TODO em
  `src/lib/clicksign.ts`.
- Verificação end-to-end real (não é mock — validado direto contra o
  servidor do Clicksign, fora do nosso banco):
  1. Marquei receituário especial → "ENVIAR PARA ASSINATURA (ICP-BRASIL)".
  2. Servidor gerou o PDF, criou envelope, subiu documento, criou signatário
     (Dr. Saad Fernandes, telefone convertido pro formato BR) e os dois
     requirements (`agree`/`sign` + `provide_evidence`/`icp_brasil`), e
     ativou o envelope (`status: running`).
  3. UI mostrou "Aguardando assinatura digital" (âmbar), campos travados.
  4. Reload persistiu o estado; lista lateral mostrou "aguardando ICP".
  5. `/paciente/consultas/[id]` mostrou "aguardando assinatura do médico" —
     não finge que já foi assinado.
  6. **Confirmação fora do app**: `GET /api/v3/envelopes/{id}` direto na API
     do Clicksign (curl, com o token real) retornou `"status":"running"` —
     prova que o envelope existe de verdade no servidor deles, não é só
     estado no nosso banco.
- Parado de propósito no link de assinatura: ninguém no time tem certificado
  ICP-Brasil real pra completar a assinatura e testar o webhook
  (`/api/webhooks/clicksign`) ponta a ponta. Esse endpoint existe e está
  pronto, mas não foi disparado de verdade — decisão do dono, registrada na
  conversa.
- Regressões: nenhuma (fluxo de prontuário simples segue OK; a mudança de
  campo do schema não afeta consultas sem receituário especial).
- Branch: `feat/smart-doctor/assinatura-icp-receituario`

---
## 2026-08-06 — Assinatura digital ICP-Brasil no receituário especial (SIMULADA)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Migração: 4 campos novos no model `Appointment` (`receituarioEspecial`,
  `assinaturaIcpEm`, `assinaturaIcpTitular`, `assinaturaIcpSerial`), todos com
  default/nullable. Servidor parado antes do `prisma db push` + `prisma generate`
  e religado depois — mesma disciplina da entrada anterior (o Turbopack observa
  `src/generated/prisma`; regenerar com o server no ar causa `PrismaClientValidationError`
  "Unknown argument", que de fato aconteceu na 1ª tentativa e foi resolvido com o restart).
- Escopo: mock, sem integração real com Clicksign/D4Sign nem AC (ITI/Serasa). A
  assinatura é gerada no servidor (`src/lib/assinatura-icp.ts`) só para a demo ter
  metadados plausíveis; todas as telas trazem o aviso "sem validade jurídica".
- Verificação end-to-end no navegador (dev na 3080):
  1. `/medico/pacientes/[patientId]` → marquei "Receituário especial" → apareceu o
     aviso de bloqueio (`lock`) e o botão virou "ASSINAR E SALVAR".
  2. Assinei → `POST /api/medico/prontuario` 200 → selo renderizou com titular
     (Dr. Saad Fernandes), nº do certificado e data; campos travados; botão sumiu.
  3. **Reload** do prontuário → selo e travamento persistiram (gravou no banco);
     lista lateral trocou "preenchido" por "assinado ICP".
  4. `/paciente/consultas/[id]` (mesma consulta) → o paciente vê o selo
     "Receituário especial assinado digitalmente" abaixo das condutas, com
     assinante+CRM, certificado, data e o aviso de amostra.
- Guard de imutabilidade: `assinaturaIcpEm != null` → API responde 409 e recusa
  edição (defesa em profundidade além da UI que esconde o botão).
- Regressões: nenhuma (fluxo do prontuário simples da entrada anterior segue
  funcionando; o texto do médico continua aparecendo na tela do paciente).
- Branch: `feat/smart-doctor/assinatura-icp-receituario`

---
## 2026-08-06 — Prontuário eletrônico (versão manual/grátis)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Migração: 2 campos novos (`resumoClinico`, `condutas`) + `prontuarioEmAt` no
  model `Appointment`. Servidor parado antes do `prisma db push` (regenera
  `src/generated/prisma`, dentro da árvore observada pelo Turbopack) e religado
  depois — evita o loop de refresh já documentado neste arquivo.
- Verificação end-to-end no navegador: `/medico` → aba Pacientes → link
  "Prontuário" (antes era um `<button>` morto, sem onClick) → formulário em
  `/medico/pacientes/[patientId]` → preenchi resumo + condutas → SALVAR →
  `POST /api/medico/prontuario` 200 → naveguei para
  `/paciente/consultas/[id]` com a mesma sessão de paciente → **o texto exato
  escrito pelo médico apareceu na tela do paciente**, substituindo o
  placeholder.
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico`

---
## 2026-08-03 — Chamada agendada após o pagamento (CallCard + .ics)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação end-to-end no navegador: agendei (Tricologia → 04/ago 08:00 → médico)
  → SIMULAR PAGAMENTO → "Consulta confirmada" **com o CallCard** ("faltam 14h
  45min", "Adicionar à agenda", "VER DETALHES"). Card também aparece na home e no
  detalhe da consulta.
- Gate do "Entrar na sala": estado TRAVADO ("Disponível 10 min antes") verificado
  ao vivo numa consulta a 2 dias. O estado LIBERADO é por código (não havia
  consulta a <10min pra disparar sem mexer no banco).
- .ics: baixado e inspecionado — DTSTART/DTEND corretos, VALARM -PT15M, e a quebra
  de linha da descrição escapada no padrão iCal (`\n`, não `\\n`). **Bug pego na
  verificação:** eu tinha escrito `\\n` literal no componente; corrigido para
  quebra real antes de fechar.
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `f8f81cb`

---
## 2026-08-03 — Portal (/) na linguagem do /paciente
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação em aba nova (console virgem): 3 cards de perfil (Paciente, Médico,
  Administrador), zero classe Pulse (`.portal-grid`/`.profile-card`), logo no
  gradiente vivo puro.
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `e89708d`
- Estado do rebrand: só a Clara (`ClaraChat`/`ThemeToggle`) segue em Pulse —
  é a única superfície com tema escuro.

---
## 2026-08-03 — /admin na linguagem do /paciente + fix de key
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação: as 4 abas do /admin (visao/medicos/clara/financeiro) sem classe
  Pulse, todas em cards da marca; "Aprovar" no verde `.sd-aurora`; nav ativo
  verde; sem ThemeToggle.
- Bug corrigido de carona: a lista de Pacientes do /medico usava `key={p.name}`
  e o demo tem 10 pacientes homônimos ("Marina Costa") → chave duplicada no React.
  O service passou a expor o `patientId` e a lista usa `key={p.id}`. **Prova
  limpa:** aba nova (buffer de console virgem) carregou /medico?tab=pacientes com
  **zero** erros de key. (O buffer do MCP na aba antiga não zera com restart do
  server, o que confundiu a leitura — daí a verificação em aba nova.)
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commits `a458c2a`, `28c97ce`

---
## 2026-08-03 — Painel do médico na linguagem do /paciente
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação no navegador (1400px): as 4 abas (agenda/pacientes/financeiro/config)
  respondem 200, **nenhuma** serve mais classe Pulse (`.block`/`.kpi`/`.btn-sm`),
  todas servem cards da marca; ícones Material Symbols renderizam como glifo (22px,
  não texto literal); nav ativo em verde `secondary-container`; CTA "Entrar na
  sala" em `.sd-aurora` (gradiente verde, texto navy, pílula). Screenshots do
  Dashboard, Financeiro e Pacientes conferidos.
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `4313873`

---
## 2026-08-03 — Verde vivo puro em botões e CTAs
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação: `.btn-sm.primary` em `/admin` resolve `rgb(63,206,60)` (vivo) com
  texto `rgb(10,20,32)`, em claro e escuro (forçado via `data-theme`); `.sd-aurora`
  ("AGENDAR" em `/paciente`) idem.
- Contraste calculado (WCAG): vivo+navy 8.91:1, teal+navy 8.74:1 (ambos acima do
  mínimo 4.5:1); antes, branco sobre essas mesmas cores dava 2.08–2.12:1.
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `f7936b3`

---
## 2026-08-03 — A logo de verdade em todo o app
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação: `/medico`, `/admin`, `/` e `/medico/login` servem o traçado do balão
  e **nenhuma** delas serve mais o traçado do "S" antigo; `/appicon` responde
  200 image/png (14.7 KB).
- ⚠️ Sem screenshot do app: o Browser pane segue recolhido. A prova visual foi um
  comparativo renderizado à parte, nos tamanhos reais (21/34/46px).
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `b6c6e3e`

---
## 2026-08-03 — Verde da marca nos painéis médico e admin
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação no navegador (`/admin` e `/medico`, 1400px, tema claro e escuro):
  `--primary` e `--aurora` resolvem em verde; **0 elementos** ainda computando o
  azul antigo; contraste do botão primário medido em **4.71:1** com texto branco
  (AA exige 4.5:1); marca da sidebar sem sublinhado e herdando a cor do texto.
- ⚠️ Sem screenshot: o Browser pane estava recolhido (viewport 0px), então a
  verificação foi por valor computado, não visual.
- Regressões: nenhuma
- Branch: `feat/smart-doctor/cadastro-medico` · commit `c15b1c7`

---
## 2026-08-03 — Limpeza final do rebrand Smart Doctor
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros)
- Verificação no navegador: `/paciente` em `localhost:3080` serve
  `<title>Smart Doctor</title>`, a description nova, e nenhuma ocorrência de
  "Instituto"/"Saad Fernandes" no HTML.
- Regressões: nenhuma detectável (sem histórico anterior para comparar — esta é a
  primeira entrada).
- Branch: `feat/smart-doctor/cadastro-medico`
