# Histórico de Testes — Smart Doctor

Regra: teste ✅ numa entrada e ❌ na seguinte = REGRESSÃO (algo antigo quebrou).

> ⚠️ Este projeto ainda **não tem runner de teste** (nem vitest, jest, playwright
> ou cypress no `package.json`). Até isso mudar, a verificação possível é
> `npx tsc --noEmit` + conferência no navegador; as entradas abaixo registram isso
> em vez de contagem de testes. Ver `mapa-cobertura.md`.

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
