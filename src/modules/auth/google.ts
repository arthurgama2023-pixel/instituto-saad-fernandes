import { db } from "@/lib/db";

// OAuth do Google feito na mão (sem NextAuth) para encaixar na sessão por
// cookie que o app já usa (sd_uid em lib/session.ts). Fluxo: /login redireciona
// ao Google → callback troca o code por token → busca o perfil → upsert do User
// → grava o cookie de sessão.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export type Area = "paciente" | "medico";

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3080";
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID/SECRET não configurados");
  return { clientId, clientSecret, redirectUri: `${appUrl}/api/auth/google/callback` };
}

/** URL de consentimento do Google para onde o usuário é redirecionado. */
export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    // força a seleção de conta e garante refresh só se precisarmos depois
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

type GoogleProfile = { sub: string; email?: string; name?: string; picture?: string };

async function exchangeAndFetchProfile(code: string): Promise<GoogleProfile> {
  const { clientId, clientSecret, redirectUri } = config();

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error(`troca de code falhou (${tokenRes.status}): ${await tokenRes.text()}`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("sem access_token na resposta do Google");

  const infoRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error(`userinfo falhou (${infoRes.status})`);
  return (await infoRes.json()) as GoogleProfile;
}

function doctorAllowlist(): string[] {
  return (process.env.AUTH_DOCTOR_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Troca o code, busca o perfil e faz upsert do usuário (por googleId, depois
 * email). Retorna o id do usuário para gravar no cookie de sessão.
 * Médicos: um e-mail entra como DOCTOR só se estiver em AUTH_DOCTOR_EMAILS e o
 * login vier da área do médico — evita que qualquer conta Google vire médica.
 */
export async function loginWithGoogle(code: string, area: Area): Promise<string> {
  const profile = await exchangeAndFetchProfile(code);
  const email = profile.email?.toLowerCase() ?? null;
  const promoverMedico = area === "medico" && !!email && doctorAllowlist().includes(email);

  const existing =
    (await db.user.findUnique({ where: { googleId: profile.sub } })) ??
    (email ? await db.user.findUnique({ where: { email } }) : null);

  if (existing) {
    const user = await db.user.update({
      where: { id: existing.id },
      data: {
        googleId: profile.sub,
        email: email ?? existing.email,
        name: profile.name ?? existing.name,
        image: profile.picture ?? existing.image,
        // promove a médico se estiver na allowlist; nunca rebaixa.
        ...(promoverMedico && existing.role !== "DOCTOR" ? { role: "DOCTOR" } : {}),
      },
    });
    return user.id;
  }

  const user = await db.user.create({
    data: {
      googleId: profile.sub,
      email,
      name: profile.name ?? "Usuário Google",
      image: profile.picture ?? null,
      role: promoverMedico ? "DOCTOR" : "PATIENT",
    },
  });
  return user.id;
}
