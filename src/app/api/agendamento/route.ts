import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/modules/catalog/seed";
import { availabilityBySpecialty } from "@/modules/scheduling/service";

/** Agenda livre da especialidade: dias, horários e quem atende em cada um. */
export async function GET(req: NextRequest) {
  await ensureSeeded();

  const slug = req.nextUrl.searchParams.get("especialidade");
  if (!slug) return NextResponse.json({ error: "especialidade obrigatória" }, { status: 400 });

  const availability = await availabilityBySpecialty(slug);
  if (!availability) return NextResponse.json({ error: "especialidade não encontrada" }, { status: 404 });

  return NextResponse.json(availability);
}
