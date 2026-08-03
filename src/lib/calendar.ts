// Gera um convite .ics (padrão iCalendar) para a consulta, que o paciente baixa e
// abre no Google/Apple Calendar. Só depende de datas — a parte de download usa
// APIs do navegador e fica isolada em downloadIcs.

export type CalEvent = {
  id: string;
  title: string;
  startsAt: string; // ISO
  durationMin: number;
  description: string;
  location: string;
};

// Data no formato iCalendar em UTC: 20260815T133000Z.
function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Caracteres que o formato exige escapar dentro de um valor de texto.
function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(ev: CalEvent, now: Date = new Date()): string {
  const start = new Date(ev.startsAt);
  const end = new Date(start.getTime() + ev.durationMin * 60000);
  // Linhas separadas por CRLF, como manda a RFC 5545.
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart Doctor//Teleconsulta//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@smartdoctor`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
    `DESCRIPTION:${escapeIcs(ev.description)}`,
    `LOCATION:${escapeIcs(ev.location)}`,
    // Lembrete 15 min antes.
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Sua teleconsulta começa em 15 minutos",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// Dispara o download do .ics no navegador.
export function downloadIcs(ev: CalEvent): void {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consulta-${ev.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
