# Etapa 8 — Modelo de Negócio & Roadmap

> Smart Doctor · Documento 8 de 9
> Como o produto ganha dinheiro, quanto sobra de cada consulta, e em que ordem construímos.

---

## 1. Tese de negócio

**Marketplace de saúde com IA como motor de conversão.** Dois lados: médicos querem agenda cheia sem custo fixo de secretária; pacientes querem resolver saúde com a fricção de mandar um "oi" no WhatsApp. A Clara é o diferencial competitivo que nenhum dos dois lados consegue replicar sozinho: ela **converte demanda difusa (sintoma) em transação (consulta paga)** 24/7.

Por que agora: telemedicina regulamentada em definitivo (CFM 2.314/2022), WhatsApp universalizado no Brasil, e LLMs finalmente bons o bastante para operar agendamento com segurança clínica (Etapa 5).

**Mercado (ordem de grandeza):** ~500 mil médicos ativos no Brasil; consultas particulares estimadas em dezenas de milhões/ano; telemedicina ainda < 10% delas — mercado em formação, sem vencedor consolidado no segmento "IA-first". SAM inicial: médicos autônomos e pequenas clínicas de especialidades eletivas (psiquiatria, psicologia, dermato, nutrição, endócrino — alta afinidade com teleconsulta e pagamento particular).

---

## 2. Modelo de receita (avaliação e recomendação)

Análise das opções, com a recomendação de sequência:

| Fonte de receita | Avaliação | Quando |
|---|---|---|
| **Take rate por consulta** ⭐ | O motor. Alinhado com o valor entregue (só ganhamos se o médico ganhar); zero barreira de entrada | **MVP** |
| **Plano Pro do médico** (SaaS híbrido) | Mensalidade que REDUZ o take — médicos de volume alto migram sozinhos; receita recorrente previsível | V2 |
| **Assinatura do paciente** ("Smart Doctor+") | Só faz sentido com densidade de oferta (benefício real: desconto + prioridade + família) | V3 |
| Teleconsulta como linha própria | Não é receita separada — é modalidade da consulta (já no take) | — |
| **Marketplace de exames** | Alta margem (comissão de laboratórios), encaixa no fluxo pós-consulta ("a Dra. pediu hemograma — agendo no lab X por R$ Y?") | V3 |
| Marketplace de farmácia | Receita → carrinho de farmácia parceira (comissão). Cuidado regulatório extra | V3+ |
| **Convênios / B2B empresas** | Saúde corporativa (empresa paga assinatura por funcionário) — ticket alto, ciclo de venda longo | Enterprise |
| IA Premium / Prontuário Premium | Anti-padrão como cobrança ao paciente (confiança). Recursos de IA premium entram no plano Pro do MÉDICO (ex.: resumos avançados, preenchimento de prontuário por voz) | V2 (lado médico) |

### 2.1 Pricing proposto

**Médico (MVP):**
- Cadastro, perfil, agenda, Clara, teleconsulta: **R$ 0/mês**
- **Take rate: 15%** por consulta realizada (paga só quando recebe)
- Repasse D+2 · sem take em consulta presencial marcada por fora (honestidade que gera confiança)

**Médico Pro (V2): R$ 199/mês → take cai para 10%**
Break-even para o médico: ~R$ 4.000/mês em consultas (≈ 22 consultas de R$ 180). Inclui: destaque na busca (rotulado como tal), relatórios avançados, prontuário por voz, Clara secretária plena (bloqueios, reagendamento em lote), múltiplos endereços.

**Paciente:** consulta avulsa sem sobretaxa (o preço do médico é o preço). Smart Doctor+ (V3): ~R$ 29/mês por família — 10% off, prioridade de encaixe, Clara proativa (lembretes de retorno, vacinas, exames periódicos).

### 2.2 Unit economics (por consulta de R$ 180, base MVP)

| Linha | Valor |
|---|---|
| Receita da plataforma (take 15%) | **R$ 27,00** |
| Gateway (PIX ~1%; cartão ~3,5% — mix 60/40) | −R$ 3,60 |
| IA (conversa completa, Opus 4.8 + caching — Etapa 5 §3.2) | −R$ 0,70 |
| Vídeo (2×30 min LiveKit) | −R$ 1,50 |
| WhatsApp (mensagens template + sessão) | −R$ 0,40 |
| Infra + STT amortizados | −R$ 0,80 |
| **Margem de contribuição** | **≈ R$ 20,00 (74%)** |

Sensibilidade: com Sonnet 5 a margem sobe ~R$ 0,45; com take 12% (promo de lançamento) cai para ~R$ 14,6 — ainda saudável. **No-show é o assassino da margem** (custo incorrido sem receita) — por isso o lembrete interativo de 24h e a política de reembolso são features de negócio, não cosmética.

Metas de eficiência: CAC paciente ≤ R$ 25 (clique-para-WhatsApp + SEO), pago em ~1,3 consultas; CAC médico ≤ R$ 400 (outbound + indicação), pago em ~2 meses de produção média (20 consultas/mês).

---

## 3. North star e KPIs

**North star: consultas realizadas/mês.** (Não "usuários", não "mensagens" — consulta realizada é valor entregue aos dois lados + receita.)

| KPI | Meta MVP (mês 6) | Meta V2 (mês 12) |
|---|---|---|
| Consultas realizadas/mês | 500 | 5.000 |
| Médicos ativos (≥ 4 consultas/mês) | 40 | 300 |
| Conversão funil Clara (conversa→consulta paga) | ≥ 25% | ≥ 35% |
| Taxa de resolução sem humano | ≥ 80% | ≥ 90% |
| No-show | ≤ 10% | ≤ 6% |
| NPS paciente / médico | ≥ 60 / ≥ 50 | ≥ 70 / ≥ 60 |
| GMV mensal | R$ 90 mil | R$ 900 mil |
| Receita mensal | R$ 13,5 mil | R$ 135 mil + SaaS Pro |

---

## 4. Roadmap

### MVP — "A Clara marca consultas de verdade" (meses 0–4)

Escopo cirúrgico — corta tudo que não prova a tese:

- ✅ WhatsApp + Clara (fluxo canônico da Etapa 3: triagem→médico→slot→PIX→confirmação→lembretes)
- ✅ Web app paciente (agenda, consultas, receitas) — **app nativo fica para V2**; WhatsApp É o app do paciente no MVP
- ✅ Painel do médico web (onboarding com validação CRM, agenda, consulta ao vivo com prontuário/receita via parceiro)
- ✅ Teleconsulta LiveKit · pagamentos PIX+cartão com split · admin essencial (aprovação, funil da Clara, financeiro)
- ✅ Segurança/LGPD fundacional (Etapa 7) + evals bloqueantes (Etapa 5 §9)
- 🎯 Lançamento: **1 vertical** (saúde mental: psiquiatria+psicologia — teleconsulta natural, recorrência alta, agenda flexível) em 1 praça (RJ), 30–50 médicos fundadores com take promocional 10% vitalício
- ❌ Fora: app nativo, convênios, exames, presencial-first, assinaturas

### V2 — "O produto completo" (meses 5–10)

- 📱 **App Flutter** (paciente + modo médico) — bottom nav com FAB da Clara (Etapa 4)
- 💳 Convênio (elegibilidade manual→integrada) · cartão 2x · **plano Médico Pro**
- 🧠 Clara nível 2: memória longitudinal, retornos proativos, encaixes inteligentes (fila de cancelamento), Clara do médico via WhatsApp
- 🌎 Expansão: +4 verticais (dermato, nutrição, endócrino, pediatria), nacional em teleconsulta
- 🏥 Presencial completo (endereços, mapas, check-in)
- 📊 WhatsApp Cloud API oficial · dashboards avançados · avaliações públicas com moderação

### V3 — "O ecossistema" (meses 11–18)

- 🔬 Marketplace de exames (labs parceiros no fluxo pós-consulta)
- 💊 Encaminhamento de receita para farmácias parceiras
- 👨‍👩‍👧 Smart Doctor+ (assinatura família) · Clara proativa de prevenção
- 🩺 Prontuário por voz para o médico (transcrição da consulta → SOAP rascunho, revisado e assinado pelo médico)
- 🔁 Recorrência automática (psicoterapia semanal, acompanhamento crônico)
- 🌐 Preparação internacional (i18n ES pronto desde a Etapa 2)

### Enterprise (meses 18+)

- 🏢 Saúde corporativa B2B (RH compra para funcionários; dashboard de saúde populacional anonimizado)
- 🏥 Multi-clínica (marca própria/white-label para clínicas médias)
- 🔗 Integrações: TISS/convênios, RNDS (rede nacional de dados em saúde), wearables
- 📜 ISO 27001 · SLA 99,9% · SSO corporativo

---

## 5. Equipe mínima por fase

| Fase | Time |
|---|---|
| MVP | 1 fundador-produto + 2 eng full-stack + 1 designer (contrato) + **1 médico RT (parcial)** + jurídico saúde (contrato) |
| V2 | +2 eng (mobile Flutter) + 1 ops/suporte + 1 growth + DPO dedicado |
| V3 | +BD (labs/farmácias) + data + 2º time de produto |

---

## 6. Riscos e mitigação

| Risco | Grau | Mitigação |
|---|---|---|
| **Ovo-e-galinha do marketplace** | alto | vertical única + praça única no MVP; médicos fundadores com take vitalício menor; a Clara agenda encaixe até em agenda rala (densidade percebida) |
| Regulatório (telemedicina/IA em saúde) | alto | RT médico desde o dia 1; Clara nunca diagnostica (auditável); jurídico especializado; acompanhamento CFM/ANPD ativo |
| Dependência do WhatsApp | médio | Cloud API oficial (compliance) + app próprio na V2 + canal web sempre disponível |
| No-show corroendo confiança | médio | lembrete interativo 24h + política clara + fila de encaixe (V2) |
| Incumbentes (Doctoralia etc.) copiarem IA | médio | velocidade + profundidade da Clara (agente operacional, não chatbot de FAQ) + dados proprietários do funil de triagem |
| Custo de IA fora de controle | baixo | circuit breaker por usuário, caching, roteamento por modelo, custo monitorado por conversa (Etapa 5 §8) |
| Incidente clínico com IA | baixo prob./alto impacto | urgência em 2 camadas + revisão médica semanal + seguro de responsabilidade civil + runbooks (Etapa 7) |

---

## 7. Aprovação

**Decisões desta etapa:**

- [ ] Motor de receita: **take rate 15%** (10% vitalício p/ médicos fundadores), zero mensalidade no MVP
- [ ] V2 introduz **Médico Pro** (R$ 199/mês, take 10%) — assinatura de paciente só na V3
- [ ] North star: **consultas realizadas/mês**
- [ ] MVP: **vertical saúde mental, praça RJ, sem app nativo** (WhatsApp + web) em ~4 meses
- [ ] App Flutter, convênios e Cloud API oficial na V2; marketplaces na V3; B2B no Enterprise
- [ ] Unit economics alvo: margem de contribuição ≥ 70% por consulta

Próxima etapa após aprovação: **09 — Crescimento & Lançamento** (go-to-market, App Store/Google Play, diferenciais competitivos e material de captação).
