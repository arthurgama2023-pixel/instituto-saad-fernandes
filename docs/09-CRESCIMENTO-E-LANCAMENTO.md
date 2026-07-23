# Etapa 9 — Crescimento, Lançamento & Captação

> Smart Doctor · Documento 9 de 9 (final)
> Como conquistamos médicos e pacientes, como publicamos nas lojas, por que vencemos
> os incumbentes — e o sumário executivo para captar investimento.

---

## 1. Go-to-market: oferta primeiro, demanda depois

Marketplace começa pelo lado difícil. O nosso é a **oferta** (médicos) — sem médico bom com horário livre, a Clara não tem o que vender.

### 1.1 Aquisição de médicos (meses 0–4, meta: 30–50 fundadores)

| Canal | Tática |
|---|---|
| **Outbound cirúrgico** | lista de psiquiatras/psicólogos com CRM ativo no RJ e presença digital fraca (Instagram ativo mas sem agenda online) — pitch: "agenda cheia sem secretária, você só paga quando recebe" |
| **Demo de 5 minutos** | o vendedor manda "tô ansioso, queria uma consulta" no WhatsApp da Clara na frente do médico — ver a IA agendar NELE é o fechamento |
| Médicos fundadores | take 10% vitalício + selo "fundador" no perfil + canal direto com o produto |
| Indicação médico→médico | R$ 300 de crédito em taxas por colega ativado (médico confia em médico) |
| Calculadora de ganhos | página /para-medicos com simulação: "12 consultas/semana × R$ 200 = R$ 8.640/mês líquido" |

**Ritual de sucesso:** primeira consulta do médico em ≤ 7 dias do cadastro (senão churn silencioso). A Clara prioriza médicos novos com slot livre no ranking de sugestão (rotulado internamente, sem corromper a relevância clínica).

### 1.2 Aquisição de pacientes

| Canal | Tática | CAC alvo |
|---|---|---|
| **Clique-para-WhatsApp ads** (Meta) | criativo = print real da conversa com a Clara; segmentação por interesse em saúde mental/bem-estar no RJ; o anúncio abre DIRETO a conversa — zero landing, zero cadastro | ≤ R$ 25 |
| **SEO programático** | páginas /especialidade/[slug] e /medico/[slug] ("psiquiatra online RJ", "dermatologista teleconsulta") — conteúdo revisado por médicos (E-E-A-T), schema.org/Physician | ~R$ 0 marginal |
| **O médico traz o paciente** 🔑 | cada médico ganha link/QR próprio (`smartdoctor.app/dra-camila`) que abre a Clara já contextualizada — a base de Instagram do médico vira nossa aquisição; consultas trazidas pelo próprio médico têm take reduzido | ~R$ 0 |
| Indicação paciente→paciente | "indique e ganhem R$ 20 cada" via link de WhatsApp (compartilhamento nativo) | baixo |
| Conteúdo/infl. micro | psicólogos/médicos criadores de conteúdo com código próprio | variável |

### 1.3 Loops de crescimento (o que compõe sozinho)

```
LOOP 1 (médico→paciente→médico): médico divulga seu link → pacientes entram →
  experimentam a Clara → voltam para OUTRAS especialidades → mais demanda → atrai médicos
LOOP 2 (documento como mídia): receita/atestado em PDF carrega a marca + QR de validação
  → circula em família/farmácia → awareness com prova social
LOOP 3 (avaliação→SEO): consulta → avaliação → perfil do médico ranqueia melhor → mais
  demanda orgânica
```

### 1.4 Retenção (mais barato que aquisição)

- A Clara **fecha o ciclo**: retorno sugerido, lembrete de acompanhamento crônico, "faz 6 meses do seu check-up".
- Recorrência natural da vertical de lançamento (psicoterapia é semanal/quinzenal) — LTV alto por design.
- Métrica de retenção: % de pacientes com 2ª consulta em 90 dias (meta ≥ 40%).

---

## 2. Publicação nas lojas (V2 — junto com o app Flutter)

### 2.1 App Store (Apple) — os pontos que reprovam apps de saúde

| Exigência | Nossa resposta |
|---|---|
| Guideline 1.4.1 (apps médicos podem causar dano físico) | Clara nunca diagnostica (documentado); disclaimers visíveis; consulta é sempre com médico CRM |
| Sign in with Apple obrigatório (temos social login) | já previsto na Etapa 4 §2.2 |
| Privacy Nutrition Labels | inventário da Etapa 7 §3 vira o formulário — coleta declarada 100% fiel |
| Permissões (câmera/mic/notificações) | pedido em contexto (na 1ª teleconsulta, não no onboarding) com texto de propósito claro |
| Account deletion in-app (obrigatório) | tela Privacidade já faz (Etapa 4 §2.11) |
| Compras digitais × serviços físicos | consulta médica = serviço real prestado por terceiro → **pagamento externo permitido** (sem IAP/30% — mesma regra de Uber/iFood) |
| Review com conta demo | conta de teste com médico sandbox + roteiro para o revisor |

### 2.2 Google Play

- Declaração **Data Safety** espelhando as Nutrition Labels; política de apps de saúde (disclaimers, sem alegações de cura).
- App Access: credenciais de teste para o time de revisão.
- Target API level atual; App Bundle; Play Integrity contra tampering.

### 2.3 ASO (as lojas como canal)

- Nome: **"Smart Doctor: médico online"** (keyword no título) · subtítulo: "Consultas por vídeo e WhatsApp".
- Keywords: telemedicina, consulta online, psiquiatra online, receita digital…
- Screenshots = mockups do Pulse contando a história em 5 telas (conversa com a Clara → médico → vídeo → receita → avaliação); preview em vídeo de 15s.
- Beta fechado (TestFlight/Play Internal) com os médicos fundadores e pacientes power users ANTES do público — reviews iniciais ≥ 4,5★ ou não lançamos.

---

## 3. Diferenciais competitivos (por que vencemos)

| | Doctoralia/BoaConsulta | Conexa/portais de convênio | **Smart Doctor** |
|---|---|---|---|
| Modelo | diretório + agenda (SaaS p/ médico) | telemedicina B2B2C de convênio | **marketplace IA-first** |
| Entrada do paciente | busca + formulário + cadastro | app do convênio | **uma mensagem no WhatsApp** |
| Triagem | paciente adivinha a especialidade | call center / fila | **Clara entende o sintoma e acha o especialista** |
| Custo p/ médico | mensalidade fixa (paga mesmo vazio) | assalariado/repasse baixo | **zero fixo, 15% só quando ganha** |
| Secretaria | do médico | da empresa | **a Clara (24/7, custo marginal ~zero)** |
| Pós-consulta | encerra na agenda | app do convênio | **receita, retorno e acompanhamento no mesmo chat** |

**Fosso (defensibilidade) em ordem de importância:** (1) dados proprietários do funil sintoma→especialidade→conversão que melhoram a Clara continuamente; (2) rede de oferta com custo de troca crescente (histórico, avaliações, recorrência); (3) profundidade do agente — replicar um chatbot é fácil, replicar um **agente operacional com segurança clínica auditada** (Etapas 5+7) é anos.

---

## 4. Comunicação de lançamento

- **Narrativa de imprensa:** "a secretária médica com IA que atende pelo WhatsApp" — demo gravada da conversa real (a Clara agendando em 60 segundos) é o asset central.
- Lançamento em 3 ondas: (1) beta fechado com fundadores → depoimentos; (2) lista de espera pública com a Clara respondendo a lista (a espera JÁ é o produto); (3) abertura RJ com PR + criadores de saúde mental.
- Tom da comunicação: o da marca (Etapa 1 §2.4) — calmo, claro, zero hype de "revolução da IA"; a demo fala.

---

## 5. Sumário executivo de captação (one-pager)

> **Smart Doctor — Inteligência que cuida.**
>
> **Problema:** marcar um médico no Brasil é fricção pura — telefone, espera, formulário, no-show de 20–30%. Médicos autônomos perdem 15–20% da receita em ociosidade de agenda e pagam secretária para trabalhar em horário comercial.
>
> **Solução:** uma secretária médica com IA no WhatsApp. O paciente descreve o sintoma como descreveria a um amigo; a Clara identifica a especialidade, encontra o médico ideal, agenda, cobra, lembra e entrega a receita — 24/7. Por trás, uma plataforma completa de telemedicina (vídeo, prontuário, receita digital ICP-Brasil, split de pagamento D+2).
>
> **Por que agora:** telemedicina definitivamente regulamentada (CFM 2.314/2022) + WhatsApp em 99% dos smartphones brasileiros + LLMs com function calling confiável o bastante para operar agendamento com guardrails clínicos auditáveis.
>
> **Modelo:** take rate de 15% por consulta realizada (zero mensalidade). Margem de contribuição de ~74% por consulta. Expansão: SaaS Pro para médicos (V2), assinatura familiar e marketplace de exames (V3), saúde corporativa (Enterprise).
>
> **Go-to-market:** vertical de saúde mental no RJ com 30–50 médicos fundadores; aquisição por clique-para-WhatsApp (CAC ≤ R$ 25, payback em 1,3 consultas) e pelo link próprio de cada médico (CAC ~zero).
>
> **Tração alvo:** 500 consultas/mês no mês 6 · 5.000/mês no mês 12 (GMV R$ 900 mil/mês).
>
> **Diferencial defensável:** dados proprietários do funil sintoma→conversão + agente de IA com segurança clínica auditada (urgência em 2 camadas, evals bloqueantes, trilha imutável) — não um chatbot.
>
> **Ask:** [investimento seed] para 18 meses de runway: time de 5, lançamento do MVP em 4 meses, V2 com app nas lojas no mês 10.
>
> **Documentação completa:** visão e branding · design system · fluxos · wireframes · arquitetura de IA · arquitetura técnica · LGPD/segurança · unit economics — `smart-doctor/docs/` (9 documentos).

---

## 6. Encerramento da documentação — próximos passos práticos

A documentação de startup está **completa (9/9)**. Ordem recomendada de execução:

1. **Validação de oferta (semana 1–2):** apresentar o pitch + demo conceitual a 10 médicos de saúde mental; meta: 5 cartas de intenção de fundadores.
2. **Protótipo navegável:** transformar Pulse (Etapa 2) + wireframes (Etapa 4) em protótipo de alta fidelidade (a página visual da identidade já dá o tom).
3. **MVP técnico (meses 0–4):** começar pelo caminho crítico — webhook WhatsApp + Clara com 6 tools essenciais + hold/pagamento PIX + painel médico mínimo. O roteiro canônico (Etapa 3 §3.2) é o teste de aceitação nº 1.
4. **Estruturação:** CNPJ adequado, RT médico, jurídico de saúde, DPA com fornecedores, RIPD (Etapa 7).
5. **Captação (paralelo):** o one-pager acima + esta documentação como data room inicial.

---

## 7. Aprovação final

- [ ] GTM oferta-primeiro: 30–50 médicos fundadores antes de ligar aquisição de pacientes
- [ ] Canal principal de demanda: clique-para-WhatsApp + link próprio do médico
- [ ] Lojas na V2 com estratégia de review preparada (contas demo, labels fiéis, pagamento externo)
- [ ] Posicionamento competitivo: "marketplace IA-first" — a Clara como secretária, não chatbot
- [ ] One-pager de captação como base do pitch deck
- [ ] Próximo passo imediato: validação com médicos + protótipo + início do MVP

**FIM DA DOCUMENTAÇÃO — Smart Doctor · Inteligência que cuida. 🩺✦**
