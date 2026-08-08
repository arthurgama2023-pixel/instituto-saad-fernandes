import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const STATUSES = ["ACTIVE", "SUSPENDED"] as const;

/** Aprova ou recusa um médico da fila de aprovação (PENDING → ACTIVE | SUSPENDED). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const doctor = await db.doctor.findUnique({ where: { id }, select: { id: true } });
  if (!doctor) return NextResponse.json({ error: "médico não encontrado" }, { status: 404 });

  await db.doctor.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, status });
}
