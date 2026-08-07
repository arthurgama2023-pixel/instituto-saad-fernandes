import { NextRequest, NextResponse } from "next/server";
import { COOKIE } from "@/lib/session";

/** Sai da conta: limpa o cookie de sessão e volta ao portal. */
function logout(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.delete(COOKIE);
  return res;
}

export const GET = logout;
export const POST = logout;
