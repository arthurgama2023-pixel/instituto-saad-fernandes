// Identificador de login do paciente: e-mail OU telefone (a pessoa digita um
// dos dois). O nome vira só dado de exibição. Isso resolve o que a versão
// "só nome" tinha de ruim — identificador único de verdade e recuperação de
// senha possível (via e-mail/telefone reais).

export type Credencial = { tipo: "email"; email: string } | { tipo: "phone"; phone: string };

// Interpreta o texto digitado. Tem "@" → e-mail; senão → telefone (E.164 com +,
// assume Brasil se vier sem o 55). Retorna null se não for válido.
export function parseIdentificador(bruto: string): Credencial | null {
  const v = bruto.trim();
  if (!v) return null;

  if (v.includes("@")) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return null;
    return { tipo: "email", email: v.toLowerCase() };
  }

  const digitos = v.replace(/\D/g, "");
  if (digitos.length < 10) return null; // DDD + número, no mínimo
  const e164 = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return { tipo: "phone", phone: `+${e164}` };
}
