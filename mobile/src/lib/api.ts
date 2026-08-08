// Client HTTP do backend Next.js. Anexa o Bearer token e normaliza erros.
// Cada rota do paciente responde 401 quando o token é inválido/expirado —
// o chamador trata (ex.: signOut) o ApiError.status === 401.

import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type RequestOpts = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Sem conexão com o servidor (${API_URL}). Confira o Wi-Fi e o IP em .env.`);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `Erro ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---- Tipos das respostas (espelham as rotas do backend) ----

export type Consulta = {
  id: string;
  medico: string;
  medicoCrm: string;
  especialidade: string;
  especialidadeSlug: string;
  icon: string;
  startsAt: string;
  durationMin: number;
  status: string;
  mode: string;
  priceCents: number;
  resumoClinico: string | null;
  condutas: string | null;
};

export type PacienteHome = {
  name: string;
  phone: string | null;
  next: Consulta | null;
  upcoming: Consulta[];
  past: Consulta[];
  specialties: { slug: string; name: string; icon: string }[];
  condicoesCronicas: string;
  alergias: string;
  healthSummary: string;
};

// ---- Endpoints ----

export const api = {
  /** Envia o código OTP por WhatsApp. Em dev, devolve devCode pra exibir na tela. */
  otpEnviar: (whatsapp: string) =>
    request<{ ok: true; nome: string; devCode?: string }>("/api/paciente/otp/enviar", {
      method: "POST",
      body: { whatsapp },
    }),

  /** Verifica o código e retorna o token de sessão. */
  otpVerificar: (whatsapp: string, codigo: string) =>
    request<{ ok: true; userId: string; nome: string; token: string }>(
      "/api/paciente/otp/verificar",
      { method: "POST", body: { whatsapp, codigo } },
    ),

  /** Dados da home do paciente logado (consultas, especialidades, resumo). */
  home: (token: string) => request<PacienteHome>("/api/paciente", { token }),

  /** Logout: revoga o token no servidor. */
  logout: (token: string) => request<{ ok: true }>("/api/paciente/logout", { method: "POST", token }),
};
