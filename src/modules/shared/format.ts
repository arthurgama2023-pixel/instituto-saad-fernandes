// Helpers de formatação PT-BR usados pela Clara e pela UI.

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDay(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "hoje";
  if (sameDay(d, tomorrow)) return "amanhã";
  return `${WEEKDAYS[d.getDay()]} ${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

export function fmtSlot(iso: string): string {
  const d = new Date(iso);
  return `${fmtDay(d)} às ${fmtTime(d)}`;
}

export function nowBR(): string {
  return new Date().toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
}
