# Etapa 7 — Segurança da Informação & LGPD

> Smart Doctor · Documento 7 de 9
> Dados de saúde são **dados sensíveis** (LGPD art. 5º, II). Aqui, privacidade não é feature —
> é a fundação do valor "Confiança é o produto" (Etapa 1). Este capítulo é o que ANPD,
> conselhos de medicina e investidores vão ler primeiro.

---

## 1. Contexto regulatório (o mapa do campo minado)

| Norma | O que exige de nós |
|---|---|
| **LGPD** (Lei 13.709/2018) | base legal para cada tratamento; direitos do titular; DPO; segurança; comunicação de incidentes à ANPD |
| **LGPD art. 11** (dados sensíveis) | saúde só com **consentimento específico** OU **tutela da saúde** por profissional/serviços de saúde |
| **Resolução CFM 2.314/2022** (telemedicina) | consentimento livre e esclarecido do paciente; registro em prontuário; sigilo; médico com CRM ativo |
| **Lei 13.787/2018 + CFM 1.821/2007** | prontuário digital válido; **guarda mínima de 20 anos** após o último registro |
| **Marco Civil da Internet** | guarda de logs de acesso à aplicação por **6 meses** |
| **Regulamento ANPD de incidentes (Res. 15/2024)** | comunicar incidente relevante à ANPD e aos titulares em **até 3 dias úteis** |
| Boas práticas | OWASP ASVS, CIS Controls; ISO 27001 como norte (certificação = fase Enterprise) |

---

## 2. Princípios de arquitetura de privacidade

1. **Minimização**: só coletamos o que a tarefa exige (cadastro progressivo — Etapa 3). Não existe campo "colete tudo".
2. **Need-to-know**: papel nenhum vê dados que não precisa. Suporte não vê prontuário; financeiro não vê queixa clínica.
3. **Separação clínico × operacional**: o dado clínico (queixa, prontuário, receita) vive criptografado e é acessível apenas pelo módulo `records` — o resto do sistema referencia por ID.
4. **A IA vê o mínimo** (Etapa 5 §6): nunca prontuário completo, nunca dado de pagamento, nunca dados de terceiros.
5. **Tudo que toca dado sensível deixa trilha** (quem, o quê, quando, por quê).

---

## 3. Inventário de dados e bases legais

| Categoria | Exemplos | Base legal | Retenção |
|---|---|---|---|
| Cadastro | nome, telefone, e-mail, CPF | execução de contrato (art. 7º V) | conta ativa + 5 anos (prescrição cível) |
| **Saúde** | queixa na triagem, prontuário, receitas, exames | **tutela da saúde** (art. 11 II f) + consentimento específico no onboarding | **20 anos** (CFM) — mesmo após exclusão da conta, com acesso selado |
| Conversas com a Clara | mensagens, áudios | execução de contrato + consentimento (1ª mensagem) | ativas 30 dias; arquivadas 5 anos com PII mascarada; áudio bruto 30 dias |
| Pagamento | transações (SEM número de cartão — fica no gateway/tokenizado) | execução de contrato | 5 anos (fiscal) |
| Logs de acesso | IP, device, timestamps | obrigação legal (Marco Civil) | 6 meses |
| Auditoria | trilha de ações | obrigação legal / legítimo interesse | 5 anos |
| Gravação de teleconsulta | vídeo (opt-in duplo) | consentimento específico | 90 dias, depois destruição certificada |

Documento vivo mantido como **RoPA** (registro de operações, art. 37) no repositório de governança.

---

## 4. Consentimento (como o produto pede)

- **1º contato com a Clara**: aviso curto + link da política; aceite registrado (timestamp, versão do texto, canal). Sem aceite → só informações públicas.
- **Onboarding app**: consentimento em camadas — (a) termos de uso, (b) tratamento de dados de saúde para o atendimento, (c) opcionais separados (comunicações de marketing OFF por padrão; uso de dados anonimizados para melhoria).
- **Teleconsulta**: termo de consentimento da telemedicina (CFM) no primeiro atendimento, renovado se mudar.
- **Gravação**: opt-in explícito dos DOIS lados, a cada consulta, registrado no prontuário.
- **Dependentes**: consentimento do responsável legal; dado do menor com proteção reforçada (art. 14).
- Todo consentimento é **versionado, consultável e revogável** na tela Privacidade (Etapa 4 §2.11).

---

## 5. Direitos do titular (self-service + DPO)

| Direito | Como atendemos | Prazo |
|---|---|---|
| Acesso / portabilidade | "Baixar meus dados" no app → pacote JSON+PDF via link seguro | imediato–15 dias |
| Correção | edição no perfil; dado clínico só via retificação médica (nova entrada no prontuário) | imediato |
| Exclusão / anonimização | "Excluir conta": apaga cadastro/conversas/preferências; **prontuário é selado, não apagado** (dever legal de guarda 20 anos — explicado em linguagem clara na própria tela) | 15 dias |
| Revogação de consentimento | toggles na tela Privacidade | imediato |
| Informação sobre compartilhamento | página "Com quem compartilhamos" (gateway, LiveKit, Anthropic, infra) | pública |
| Reclamação | canal do DPO (dpo@smartdoctor...) com SLA de resposta 5 dias úteis | — |

---

## 6. Criptografia e gestão de segredos

| Camada | Padrão |
|---|---|
| Em trânsito | TLS 1.3 em tudo (público e interno); HSTS; certificate pinning no app Flutter |
| Em repouso (infra) | discos/banco/storage criptografados (padrão do provedor) |
| **Em repouso (aplicação)** | CPF, conteúdo de prontuário/receita, tokens OAuth: **AES-256-GCM** app-level; blob ilegível mesmo com dump do banco |
| Chaves | KMS gerenciado; envelope encryption; rotação anual + rotação imediata em suspeita; chaves NUNCA em env de app (env carrega só a referência) |
| Segredos | secret manager do provedor; `.env` local fora do git (disciplina já praticada); scan de segredos no CI (gitleaks) |
| Senhas/OTP | não há senha de paciente (OTP); OTP hash + expiração 5 min + máx 5 tentativas; senha admin: argon2id |
| Documentos (R2) | URLs assinadas com expiração 15 min; nunca URL pública |

---

## 7. Controle de acesso

- **RBAC** com papéis mínimos: `patient`, `doctor`, `admin.operacao`, `admin.financeiro`, `admin.clinico`, `suporte`, `dpo` — matriz papel×recurso versionada no repo.
- **2FA obrigatório** para médico e admin (TOTP); paciente = posse do WhatsApp (OTP).
- **Acesso a prontuário**: médico só acessa prontuário de paciente com consulta ativa/histórica com ele; admin clínico exige **justificativa escrita** logada (padrão break-glass); alerta ao DPO em acessos atípicos.
- Sessões: expiração deslizante, revogação remota ("sair de todos os dispositivos"), device binding no app.
- Ambientes segregados: dev/staging usam **dados sintéticos** — nunca cópia de produção.

---

## 8. Auditoria imutável

- Toda ação sensível gera `AuditLog` com **hash encadeado** (hash do registro inclui o hash do anterior) — adulteração quebra a cadeia e é detectável.
- Logado: leitura de prontuário (com justificativa), mudança de prompt da Clara, aprovação de médico, reembolso manual, exportação de dados, mudança de permissão, decisão de urgência da IA.
- Logs de aplicação com **PII mascarada por padrão** (telefone → `219****309`); correlação por IDs.
- Retenção 5 anos; export para o conselho médico/jurídico sob demanda.

---

## 9. Segurança de aplicação (AppSec)

| Vetor | Defesa |
|---|---|
| Injeção / XSS / CSRF | ORM parametrizado, CSP estrita, SameSite, sanitização server-side |
| IDOR (o risco nº1 em saúde) | autorização **por recurso** em toda rota (`paciente só vê o seu`); testes automatizados de IDOR no CI |
| Abuso de OTP / brute force | rate limit por número+IP, backoff, alerta |
| Upload malicioso | validação de MIME real, antivírus (ClamAV) em exames enviados, R2 isolado |
| Dependências | Dependabot + audit no CI; imagem de container mínima e escaneada |
| Borda | Cloudflare WAF + bot management; admin atrás de allowlist/VPN opcional |
| Webhooks | verificação de assinatura (gateway) e token+IP (WhatsApp); idempotência |
| Prompt injection na Clara | camadas da Etapa 5 §7 (regra 10, confirmação, autorização no executor) |
| Validação externa | **pentest anual** + antes do lançamento; política de divulgação responsável (security.txt) |

**Fornecedores (operadores)**: DPA assinado com todos que tocam dado pessoal (gateway, LiveKit, Anthropic, Cloudflare, Render/AWS, Resend). API da Anthropic: dados **não são usados para treino** por padrão e o DPA cobre o processamento; conteúdo clínico enviado ao modelo é o mínimo necessário (Etapa 5 §6). Matriz de subprocessadores publicada na política de privacidade.

---

## 10. Resposta a incidentes

**Severidades:** S1 vazamento de dado sensível / comprometimento de conta médica · S2 indisponibilidade total · S3 falha parcial · S4 bug sem exposição.

```
Detecção (alerta, relato, hunting)
  → Contenção (revogar credenciais, isolar serviço, desligar feature flag)
  → Avaliação com DPO: dado sensível exposto? escala? risco ao titular?
  → SIM relevante: comunicar ANPD + titulares em ATÉ 3 DIAS ÚTEIS (Res. 15/2024)
     com: natureza, dados afetados, medidas, recomendações
  → Erradicação e recuperação
  → Post-mortem sem culpados em 5 dias, ações rastreadas
```

Runbooks prontos para os 5 piores cenários: vazamento de prontuário, conta de médico comprometida, ransomware, chave de API exposta, gravação de consulta acessada indevidamente. Simulação (tabletop) semestral.

**Backup/DR:** Postgres PITR + snapshot diário; RPO ≤ 15 min, RTO ≤ 4h (MVP); restore testado mensalmente de forma automatizada; backups criptografados em região distinta.

---

## 11. Governança

- **DPO nomeado** desde o dia 1 (acumulável pelo fundador no MVP, com assessoria jurídica especializada em saúde digital).
- **Responsável Técnico médico** (exigência para plataforma de telemedicina) — CRM ativo, participa da revisão de urgências (Etapa 5) e do dicionário clínico.
- Treinamento de privacidade no onboarding de qualquer pessoa com acesso a produção; acesso de produção nominal (zero contas compartilhadas).
- **RIPD** (Relatório de Impacto, art. 38) elaborado antes do lançamento público — este documento é o insumo.
- Revisão trimestral: acessos, permissões, fornecedores, retenções vencidas (job automático de expurgo com relatório).

---

## 12. Aprovação

**Decisões desta etapa:**

- [ ] Base legal principal para dados de saúde: **tutela da saúde + consentimento específico** em camadas
- [ ] Prontuário: guarda 20 anos, **selado** (não apagado) na exclusão de conta — comunicado com transparência
- [ ] Criptografia app-level (AES-256-GCM + KMS) para CPF, prontuário, receitas e tokens
- [ ] Acesso a prontuário com justificativa logada (break-glass) + trilha hash-encadeada
- [ ] Comunicação de incidentes: processo de 3 dias úteis (ANPD) com runbooks prontos
- [ ] DPO + Responsável Técnico médico desde o MVP; RIPD antes do lançamento
- [ ] Pentest anual + dados sintéticos em dev/staging

Próxima etapa após aprovação: **08 — Modelo de Negócio & Roadmap** (monetização, pricing, unit economics, MVP → Enterprise).
