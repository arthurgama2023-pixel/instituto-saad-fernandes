import { NextRequest, NextResponse } from "next/server";

// CORS SÓ EM DEV, para o alvo *web* do app Expo (react-native-web em
// localhost:8081) conseguir falar com a API. Em produção o app mobile é NATIVO
// — não passa por CORS — então isto fica inerte (guarda por NODE_ENV).
// Escopo: apenas /api/* (ver `config.matcher`).

function isDevOrigin(origin: string): boolean {
  // localhost / 127.0.0.1 / IP de LAN (192.168.x.x), qualquer porta.
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
}

function applyCors(res: NextResponse, origin: string) {
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed =
    process.env.NODE_ENV !== "production" && !!origin && isDevOrigin(origin);

  // Fora do caso dev-permitido, não tocamos em nada: o Next trata a request
  // (inclusive OPTIONS) exatamente como antes. Assim produção fica inalterada.
  if (!allowed) return NextResponse.next();

  // Preflight do CORS (só chega aqui em dev, com origem permitida).
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCors(res, origin!);
    return res;
  }

  const res = NextResponse.next();
  applyCors(res, origin!);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
