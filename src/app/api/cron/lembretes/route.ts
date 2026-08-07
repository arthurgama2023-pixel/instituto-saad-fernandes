import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyAppointment } from "@/modules/notifications/appointments";

// Lembretes de consulta em 3 marcos: 24h, 1h e 30min antes. Como não há worker
// no MVP, um cron externo chama este endpoint periodicamente (ex.: a cada 10min)
// e ele decide quais lembretes já venceram e ainda não foram enviados.
// Protegido por CRON_SECRET.

const OFFSETS_MIN = [1440, 60, 30]; // 24h, 1h, 30min
const MAX_LEAD_MIN = 1440; // só olha consultas nas próximas 24h

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const ate = new Date(now.getTime() + MAX_LEAD_MIN * 60000);

  const appts = await db.appointment.findMany({
    where: { status: "CONFIRMADA", startsAt: { gt: now, lte: ate } },
    select: { id: true, startsAt: true, createdAt: true, remindersSent: true },
  });

  let enviados = 0;
  for (const a of appts) {
    const jaEnviados = new Set(a.remindersSent.split(",").filter(Boolean).map(Number));

    // Um marco X está "vencido" quando já passou de (início − X) E esse instante
    // é depois da criação da consulta (senão o marco nem existiu p/ ela) E ainda
    // não foi enviado.
    const vencidos = OFFSETS_MIN.filter((x) => {
      const marco = a.startsAt.getTime() - x * 60000;
      return now.getTime() >= marco && marco >= a.createdAt.getTime() && !jaEnviados.has(x);
    });
    if (vencidos.length === 0) continue;

    // Manda só o marco mais próximo do horário (menor antecedência) e consome os
    // demais vencidos — evita disparar vários e-mails de uma vez se o cron atrasou.
    const escolhido = Math.min(...vencidos);
    await notifyAppointment(a.id, "lembrete", { offsetMin: escolhido });
    vencidos.forEach((x) => jaEnviados.add(x));
    await db.appointment.update({
      where: { id: a.id },
      data: { remindersSent: [...jaEnviados].sort((p, q) => q - p).join(",") },
    });
    enviados++;
  }

  return NextResponse.json({ ok: true, verificados: appts.length, enviados });
}
