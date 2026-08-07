# Histórico de Testes — Smart Doctor

Regra: teste ✅ numa entrada e ❌ na seguinte = REGRESSÃO (algo antigo quebrou).

> ⚠️ Este projeto ainda **não tem runner de teste** (nem vitest, jest, playwright
> ou cypress no `package.json`). Até isso mudar, a verificação possível é
> `npx tsc --noEmit` + conferência no navegador; as entradas abaixo registram isso
> em vez de contagem de testes. Ver `mapa-cobertura.md`.

---
## 2026-08-07 — Onboarding do médico: realtime + e-mail de aprovação + login/senha
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ · `DATABASE_URL="" npm run build` ✅.
- Fecha o ciclo do médico: cadastro→PENDING→admin aprova→e-mail→cria senha→loga.
- O quê:
  - **Realtime (Supabase Broadcast)**: `lib/realtime.ts` publica no canal
    `admin-medicos` (HTTP broadcast do Supabase) após cadastro e após aprovar/
    recusar; `admin/RealtimeMedicos.tsx` (client) escuta e faz router.refresh().
    Escolhido Broadcast (não postgres_changes) porque o dev grava no SQLite e
    postgres_changes exporia certPfx/certSenha do Doctor pro anon.
  - **E-mail de aprovação**: `notifications/doctor-onboarding.ts` gera token de
    ativação (7 dias) e manda o link via `sendMail` (no-op sem GMAIL). A API de
    aprovação devolve `ativacaoLink` — o ApproveRow mostra pro admin copiar.
  - **Ativação**: `/medico/ativar?token=` + `/api/medico/ativar` (GET valida/
    prefill, POST grava e-mail+senha, queima o token). Senha via scrypt
    (`lib/senha.ts`, sem dep nova). Campos novos no User: senhaHash,
    ativacaoToken, ativacaoExpira (db push no SQLite).
  - **Login real do médico**: reescreve `/medico/login` (mata a demo falsa) +
    `/api/medico/login` — e-mail+senha (scrypt) E gate `status===ACTIVE`.
- Prova ao vivo (SQLite): cadastro→aprovar (retorna link)→GET valida→POST cria
  senha→token vira 404 (uso único)→login senha errada 401→senha certa 200+sessão
  →suspender→login 403 (gate). Realtime: painel /admin aberto no browser,
  cadastro via curl, "Dr. Realtime AoVivo" apareceu na fila **sem F5** (screenshot).
- Segurança: zero senha/token/segredo no diff (scrypt salt+hash, timing-safe).
- Pendência do dono: `GMAIL_USER`+`GMAIL_APP_PASSWORD` no `.env.local` p/ envio
  real (hoje no-op; link exposto p/ testar). Dados de demo limpos (meus testes
  removidos, seed-demo devolvido a PENDING).

---
## 2026-08-07 — Login do admin + aprovação real de médicos
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ · `DATABASE_URL="" npm run build` ✅.
- Contexto: `/admin` estava aberto pra qualquer um e os botões Aprovar/Recusar
  eram stubs mortos (sem onClick, sem API, sem mutação de status no código).
- O quê:
  - `src/lib/admin-session.ts`: sessão do admin por cookie `sd_admin` = token
    HMAC-SHA256 derivado de `ADMIN_PASSWORD` (env). Credencial no ambiente
    (`ADMIN_USER`/`ADMIN_PASSWORD`), nunca hardcoded. `conferirCredenciais`
    timing-safe.
  - `/admin/login` (página) + `/api/admin/{login,logout}` + gate no topo de
    `admin/page.tsx` (redirect pra /admin/login sem sessão) + botão Sair.
  - Aprovação real: `setDoctorStatus` (admin/service.ts) + `/api/admin/medicos/
    [id]` (POST, gated) + `ApproveRow` virou client component (fetch +
    router.refresh). Aprovar→ACTIVE, Recusar→SUSPENDED.
  - `.env.example`: ADMIN_USER/ADMIN_PASSWORD (placeholders). `.env.local`
    (gitignored) recebeu credencial de dev.
- Prova ao vivo: /admin sem sessão → 307 /admin/login; senha errada → 401;
  senha certa → cookie + 200 no painel (login via UI caiu em "Visão geral");
  aprovar sem sessão → 401, com sessão → 200 ACTIVE (confirmado no banco);
  logout → 303 e /admin bloqueia de novo. Médico de teste revertido a PENDING.
- Segurança: senha não aparece em nenhum arquivo rastreado; só process.env.
- DEFERIDO (decisão do dono): login OTP real do médico + gate por status ACTIVE
  no login do médico (a peça de aprovação já fica pronta pra quando vier).

---
## 2026-08-07 — Unifica login do paciente no /entrar (mata /login demo inseguro)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ · `DATABASE_URL="" npm run build` ✅.
- BUG relatado pelo dono: `/login` deixava QUALQUER credencial entrar
  (`login/page.tsx` só fazia `router.push("/paciente")`, comentário "Demo: ainda
  não há verificação de senha"). E a home (`page.tsx`) mandava o paciente pra
  essa tela insegura. Causa: o merge de integração juntou o `/login` demo do
  amigo com o `/entrar` real (Supabase) nosso e nunca escolheu um — `/entrar`
  ficou órfão.
- Correção (unificar no /entrar, Supabase real):
  - `page.tsx`: card Paciente → `/entrar` (era `/login`).
  - `login/page.tsx`: vira redirect server-side pra `/entrar` (preserva ?erro).
  - `entrar/page.tsx`: remove link "voltar ao acesso antigo" + trata ?erro do
    Google (mensagem não se perde no redirect).
  - `google/{login,callback}/route.ts`: retorno de erro do paciente → `/entrar`.
  - `entrar/layout.tsx`: comentário atualizado (era "não substitui /login ainda").
- Prova ao vivo: `/login` → 302 pra `/entrar` ✅; `/entrar` com senha errada →
  fica na tela com "E-mail/telefone ou senha incorretos", NÃO entra ✅; home
  card Paciente → `/entrar` ✅; registro em `/entrar/registrar` cria conta no
  Supabase ✅.
- Nota: durante o diagnóstico criei conta de teste `teste-diag-0807@example.com`
  no Supabase Auth do dono — pode apagar no painel.

---
## 2026-08-07 — RLS nativo ligado ao app (Supabase Postgres)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros) · `DATABASE_URL="" npm run build` ✅ (43 rotas) · **0 regressões**.
- O quê: ligou o mecanismo de RLS de verdade. Antes as políticas existiam mas
  nenhuma request passava por elas (papel `postgres` = bypassrls). Agora:
  - `src/lib/db.ts`: wrapper `runAsUser(userId, fn)` — abre transação, roda
    `SET LOCAL ROLE authenticated` + `set_config('app.uid', ...)`, e via
    `AsyncLocalStorage`+`Proxy` faz o `db` de nível de módulo (usado nos
    services) resolver pra essa transação. No SQLite é passthrough (dev local
    intacto).
  - `prisma/rls.sql`: +5 políticas SELECT (Payment, UrgencyRequest,
    Conversation, Message, Documento) no mesmo estilo da de Appointment, +grant
    Specialty. Aplicadas no Supabase (schema já empurrado via db:push direto).
  - `getAuthedDoctorUserId()` (ponte Doctor.id→User.id) em doctor-session.ts.
  - Rotas ligadas ao runAsUser: **só leitura pura** — `paciente/documentos`
    (lista) e `[id]` (detalhe; `marcarLido` fica FORA, no client normal),
    `medico/certificado` GET.
- Prova ao vivo:
  - (a) Isolamento no banco (script pg contra o pooler): paciente A só vê docs
    de A, B só de B, médico dono vê os dois, sem `app.uid` não vê nada. ✅
  - (b) Ponta a ponta pela rota real `/api/paciente/documentos` contra o
    Supabase: sd_uid=A → só "Doc do X"; sd_uid=B → só "Doc do Y". ✅
  - SQLite dev pós-reversão: documentos list 200, certificado sem auth 401. ✅
- Escopo deferido (consciente, NÃO é regressão): políticas de INSERT/UPDATE e
  o wiring das rotas que escrevem no caminho de leitura (paciente GET →
  expireStaleHolds, urgencia GET → expireStaleRequests, chat GET →
  getOrCreateConversation/welcome). Essas rotas ficaram COMO ESTAVAM (sem
  runAsUser) pra não quebrar contra o Postgres — esperam as políticas de
  escrita. RLS na tabela Doctor também deferido (só GRANT).
- Bug PRÉ-EXISTENTE achado (fora do escopo, virou spawn_task): `seed.ts` grava
  `cpf` no Doctor, campo que não existe no schema — quebra seed em banco novo
  (produção). Latente só porque o SQLite local já estava semeado.
- Supabase: schema empurrado (12 tabelas) + políticas aplicadas; dados de teste
  limpos ao final (tabelas voltaram a vazias).
- Branch: `feat/smart-doctor/integracao`. NÃO empurrado.

---
## 2026-08-07 — Integração com o trabalho do amigo (origin/main) + drop Clicksign
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros) · app roda sem erro no
  servidor.
- Reconciliação de duas linhas divergentes da base 7779d13:
  - Amigo (origin/main, +2637 linhas): Jitsi (vídeo real), login Google, e-mail
    de consulta + cron, canal de documentos, **ICP-Brasil A1/PAdES** (assinatura
    self-hosted, certificado por médico), prontuário editável na chamada.
  - Nós: ICP via Clicksign, aba Urgência, fundação RLS, auth Supabase.
- Decisões do dono: **ficar só com o A1** (descartar Clicksign) e **só o Supabase**
  (Google fica pra depois, mas o código dele veio no merge e convive via cookie).
- Como resolvi: para ICP/prontuário/exames/cadastro peguei a versão do amigo
  (`git checkout origin/main -- ...`), apaguei os arquivos só-Clicksign
  (clicksign.ts, receituario-pdf.ts, webhook, rota de download), removi os campos
  Clicksign do schema, e re-adicionei o que é nosso (authId no User, skip-demo em
  conta real). package.json = união das deps (@supabase + @signpdf + nodemailer).
- Pegadinha: durante a resolução, o package.json ficou momentaneamente com
  marcadores de conflito; o Tailwind/Turbopack cacheou o erro "JSON position 944".
  Resolvido reescrevendo o package.json com LF (sem CRLF/BOM) + `rm -rf .next`.
- Verificação ao vivo (código mesclado): nosso login Supabase → "Olá, Pedro" ✅;
  cadastro do médico do amigo (E-mail + uploader A1) renderiza ✅; aba Urgência
  preservada ✅; sem erro no servidor ✅.
- Branch: `feat/smart-doctor/integracao` (merge de origin/main). NÃO empurrado.
- Pendências: testar A FUNDO os fluxos do amigo (assinar A1, vídeo Jitsi, e-mail);
  RLS nativo ainda pendente; Google login não unificado com Supabase.

---
## 2026-08-07 — Correção: login mostrava o paciente demo (Marina) — middleware
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros).
- BUG relatado pelo dono: logava e a plataforma mostrava "Marina" (paciente
  demo) em vez do próprio nome. Causa: faltava o middleware de sessão do
  @supabase/ssr — sem ele o token não é revalidado a cada requisição, então o
  servidor "perde" a sessão e o `getDemoUser` cai no fallback demo.
- Correção: `src/middleware.ts` + `src/lib/supabase/middleware.ts`
  (`updateSession`) — padrão recomendado do @supabase/ssr; refresca/propaga a
  sessão em toda requisição (matcher pula assets estáticos).
- Verificação end-to-end (caminho exato do dono, conta nova):
  - Deslogar → registrar "Pedro Henrique Silva" → "Conta criada!" → login →
    `/paciente` mostrou **"Olá, Pedro 👋"**. ✅
  - **Teste crucial do middleware:** naveguei pra /paciente/exames e voltei pra
    /paciente → continuou "Olá, Pedro" (antes revertia pra Marina). ✅
  - Servidor sem erros. (Console do browser ainda exibia erros STALE de
    `emailInternoDoNome` de builds antigos — grep confirma que o import não
    existe; tsc limpo; log do servidor limpo.)
- Branch: `feat/smart-doctor/auth-supabase`

---
## 2026-08-07 — Wiring: app reconhece o paciente logado (fluxo entrar completo)
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros).
- Fecha o fluxo pedido: registrar → tela "Conta criada!" → login → **entra na
  plataforma** (`/paciente`) já reconhecido como ELE, não mais o demo Marina.
- Mudanças:
  - Registro: após `signUp`, faz `signOut` + mostra tela de sucesso com botão
    "IR PARA O LOGIN" (a pessoa entra de propósito com o que criou).
  - Login: redireciona pra `/paciente` (antes ia pra tela de debug /sessao).
  - `schema.prisma`: +`User.authId` (@unique) — vínculo com o auth.uid.
  - `lib/session.ts`: `getDemoUser` virou SESSION-AWARE — se há sessão Supabase,
    acha/cria um User ligado ao auth.uid (nome dos metadados) e retorna ele;
    senão, cai no demo por cookie (fluxo antigo intacto). Nome mantido pra não
    tocar nas ~9 rotas que importam (dívida de nome registrada). +`isContaReal`.
  - `/api/paciente`: não semeia dados demo em conta real (conta nova = vazia).
- Verificação end-to-end ao vivo:
  - Registrar "Juliana Martins" (e-mail) → "Conta criada!" → login → `/paciente`
    mostrou **"Olá, Juliana 👋"** e "Você não tem consultas agendadas" (dados
    DELA, vazios) — não mais a consulta da Marina. ✅
  - Sem erros no servidor; reload de `/paciente` mantém "Olá, Juliana". ✅
  - (Erros `emailInternoDoNome` no console eram STALE do build anterior; grep
    confirma que não há mais esse import; tsc limpo.)
- **IMPORTANTE — nível de isolamento AGORA:** este wiring dá isolamento no
  NÍVEL DO APP (cada rota resolve o usuário logado e consulta por id dele). O
  RLS no banco (Caminho B, "seguro por padrão") só entra quando os DADOS do app
  migrarem pro Supabase Postgres — hoje o app roda em SQLite local. Ou seja: a
  fundação de RLS está provada (rls.sql), mas o app ainda não a exercita.
- COLIDE com a ICP do amigo (mexe em schema/session/rota) — feito com o "sim"
  explícito do dono, ciente do merge a reconciliar depois.
- Branch: `feat/smart-doctor/auth-supabase`

---
## 2026-08-07 — Telas de login real (Supabase Auth) — rota /entrar
- Testes: **sem suíte** · `npx tsc --noEmit` ✅ (0 erros).
- Aditivo, baixa colisão com a ICP do amigo: rota NOVA `/entrar` (não substitui
  o /login demo ainda). Deps novas: @supabase/supabase-js, @supabase/ssr.
- Arquivos: `src/lib/supabase/client.ts` (browser) e `server.ts` (SSR via
  cookies); `/entrar` (telefone→código, 2 etapas), `/entrar/sessao` (server
  component que lê a sessão), `/entrar/sair` (route handler de logout).
  `.env.example` ganhou NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (a key real fica só
  no .env.local gitignored — anon key é pública, mas não vai pro repo).
- Verificação end-to-end no navegador (número de teste, sem SMS):
  1. `/entrar` → telefone → "ENVIAR CÓDIGO" → avançou pra etapa de código
     (Supabase aceitou o OTP).
  2. código `123456` → verificou → redirect pra `/entrar/sessao`.
  3. `/entrar/sessao` (SERVIDOR) mostrou **"Sessão ativa"** com telefone
     5511988887777, auth.uid cd3d62d5-…, papel authenticated — o backend do
     Next reconheceu o login via cookie. Essa é a identidade que o RLS consome.
  4. Logout → `/entrar/sessao` volta a "Nenhuma sessão".
- Gotcha (ambiente, não código): o dev server via Turbopack no browser pane
  hidrata de forma intermitente (HMR websocket falha), então cliques/digitação
  às vezes não pegam. Contornei setando o input pelo setter nativo + evento e
  `form.requestSubmit()`. O código em si está correto (typecheck + fluxo real
  do Supabase respondendo).
- **MÉTODO FINAL (evoluiu com o dono, tudo na mesma branch, nada commitado):**
  o método passou por telefone/OTP → nome+senha → e o **estado final é
  nome + (e-mail OU telefone) + senha + confirmar senha**. O e-mail/telefone é
  o identificador de login real; o nome é só exibição. Isso RESOLVE as duas
  fraquezas da versão "só nome": identificador único de verdade e recuperação
  de senha possível.
- `src/lib/auth-identidade.ts`: `parseIdentificador()` detecta e-mail (tem "@")
  ou telefone (E.164, assume 55 no Brasil). Registro/login usam
  `signUp`/`signInWithPassword` com email OU phone conforme o caso. No Supabase:
  `mailer_autoconfirm` e `sms_autoconfirm` ligados (sem confirmação por link/SMS
  nesta fase — em produção, ligar confirmação exige SMTP/provedor de SMS, e sem
  ela alguém pode cadastrar e-mail/telefone que não é dele; ressalva registrada).
- Regras: nome mín. 2 palavras; senha mín. 6 caracteres (sem exigência de
  maiúscula/número — mínimo do Supabase); confirmação idêntica.
- Verificação dos fluxos ao vivo:
  - Registrar com E-MAIL ("Mariana Ferreira", mariana.ferreira@teste.com) →
    "Sessão ativa" mostrando o e-mail, papel `patient`. ✅
  - Registrar com TELEFONE ("Roberto Alves", 11966665555) → sessão mostrando o
    telefone. ✅
  - Login com telefone + senha → mesma conta (auth.uid 2c07c0dc-… confere). ✅
  - (versão anterior nome+senha também passou: senha errada recusada, nome
    duplicado recusado.)
- Ficaram usuários de teste em auth.users (dos experimentos) — artefatos de
  dev, limpar depois se quiser (precisa da service_role key).
- NÃO liga ao resto do app ainda (login/registro não gatilham dado; segue
  getDemoUser). O wiring nativo (inclusive criar o User no nosso banco a partir
  dos metadados do auth) espera a ICP do amigo.
- Branch: `feat/smart-doctor/auth-supabase`

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
