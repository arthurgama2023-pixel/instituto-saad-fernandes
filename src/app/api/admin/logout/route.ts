import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-session";

/** Encerra a sessão do admin e volta pro login. */
export async function POST(req: NextRequest) {
  await clearAdminSession();
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
