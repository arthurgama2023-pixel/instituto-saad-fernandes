// NÍVEL 1 — detecção determinística de urgência (Etapa 5 §2).
// Roda ANTES e independente do LLM: se o modelo cair, a resposta de emergência sai.
// Lista mantida com revisão médica (Etapa 5 §8.2 — mudanças exigem aprovação de médico).

const CRITICAL_TERMS: { pattern: RegExp; trigger: string; category: string }[] = [
  { pattern: /dor no peito|aperto no peito|peito apertado/, trigger: "dor no peito", category: "cardio" },
  { pattern: /falta de ar|nao consigo respirar|não consigo respirar|sufocan/, trigger: "falta de ar", category: "respiratorio" },
  { pattern: /fala enrolada|boca torta|fraqueza s[uú]bita|formig(ou|ando).*(braço|braco|rosto)/, trigger: "sinais de AVC", category: "avc" },
  { pattern: /desmai(ei|ou|ando)|inconsciente/, trigger: "desmaio", category: "neuro" },
  { pattern: /sangramento (intenso|forte|que nao para|que não para)|muito sangue/, trigger: "sangramento intenso", category: "hemorragia" },
  { pattern: /me matar|suic[ií]dio|suicida|tirar minha vida|nao quero mais viver|não quero mais viver|acabar com tudo/, trigger: "ideação suicida", category: "saude_mental" },
  { pattern: /convuls[aã]o|convulsionando/, trigger: "convulsão", category: "neuro" },
  { pattern: /alergia grave|garganta fechando|l[aá]bio incha|rosto inchando/, trigger: "reação alérgica grave", category: "anafilaxia" },
  { pattern: /(bebe|bebê|rec[eé]m.nascido).*(febre alta|roxo|molinho|não reage|nao reage)/, trigger: "sintoma grave em bebê", category: "pediatria" },
  { pattern: /overdose|tomei (muitos|varios|vários) (rem[eé]dios|comprimidos)/, trigger: "intoxicação", category: "toxico" },
];

export type UrgencyHit = { trigger: string; category: string };

export function detectUrgency(text: string): UrgencyHit | null {
  const norm = text.toLowerCase();
  for (const t of CRITICAL_TERMS) {
    if (t.pattern.test(norm)) return { trigger: t.trigger, category: t.category };
  }
  return null;
}

export function emergencyMessage(name: string, hit: UrgencyHit): string {
  if (hit.category === "saude_mental") {
    return (
      `${name}, obrigada por confiar isso a mim. O que você está sentindo é sério e você não precisa passar por isso sozinho(a). 💙\n\n` +
      `Por favor, ligue AGORA para o *CVV — 188* (24h, gratuito) ou acesse cvv.org.br. ` +
      `Se houver risco imediato, ligue *192 (SAMU)* ou vá ao pronto-socorro mais próximo.\n\n` +
      `Vou verificar como você está daqui a algumas horas. Você importa.`
    );
  }
  return (
    `⚠️ ${name}, o que você descreveu (*${hit.trigger}*) pode ser sério.\n\n` +
    `Procure um *pronto-socorro AGORA* ou ligue *192 (SAMU)*. ` +
    `Não espere uma teleconsulta para isso.\n\n` +
    `Depois que estiver em segurança, me escreva que eu te ajudo com o acompanhamento. 💙`
  );
}
