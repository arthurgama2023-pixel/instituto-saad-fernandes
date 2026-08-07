import { NextRequest, NextResponse } from "next/server";
import { db, runAsUser } from "@/lib/db";
import { getAuthedDoctorId, getAuthedDoctorUserId } from "@/lib/doctor-session";
import { validarCertificado } from "@/modules/signing/icp";
import { cifrar, cifrarTexto, criptografiaHabilitada } from "@/modules/signing/cripto";

const MAX_PFX = 256 * 1024; // 256 KB (um A1 é pequeno)

const NAO_AUTENTICADO = { error: "Entre como médico para gerenciar seu certificado.", naoAutenticado: true };

/** Status do certificado do MÉDICO AUTENTICADO (nunca de um doctorId do cliente). */
export async function GET() {
  const doctorId = await getAuthedDoctorId();
  const doctorUserId = await getAuthedDoctorUserId();
  if (!doctorId || !doctorUserId) return NextResponse.json({ ...NAO_AUTENTICADO, configurado: false }, { status: 401 });

  const doctor = await runAsUser(doctorUserId, (tx) =>
    tx.doctor.findUnique({
      where: { id: doctorId },
      select: { certNome: true, certEm: true, certPfx: true },
    }),
  );
  return NextResponse.json({
    configurado: Boolean(doctor?.certPfx),
    nome: doctor?.certNome ?? null,
    em: doctor?.certEm?.toISOString() ?? null,
    criptografiaHabilitada: criptografiaHabilitada(),
  });
}

/** Cadastra o A1 (.pfx) do médico autenticado: valida, cifra e guarda. */
export async function POST(req: NextRequest) {
  const doctorId = await getAuthedDoctorId();
  if (!doctorId) return NextResponse.json(NAO_AUTENTICADO, { status: 401 });

  if (!criptografiaHabilitada()) {
    return NextResponse.json(
      { error: "Configure APP_ENCRYPTION_KEY no servidor para guardar certificados com segurança." },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "envio inválido" }, { status: 400 });

  const senha = String(form.get("senha") ?? "");
  const file = form.get("arquivo");
  if (!senha) return NextResponse.json({ error: "informe a senha do certificado" }, { status: 400 });
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return NextResponse.json({ error: "anexe o arquivo .pfx" }, { status: 400 });
  }
  const f = file as File;
  if (f.size === 0 || f.size > MAX_PFX) return NextResponse.json({ error: "arquivo .pfx inválido" }, { status: 400 });

  const pfx = Buffer.from(await f.arrayBuffer());

  // Valida senha + compatibilidade do formato assinando um PDF de teste.
  const ok = await validarCertificado(pfx, senha);
  if (!ok) {
    return NextResponse.json(
      { error: "Não consegui usar este certificado. Verifique a senha e se é um A1 (.pfx) compatível." },
      { status: 422 },
    );
  }

  const certPfx = cifrar(pfx);
  const certSenha = cifrarTexto(senha);
  if (!certPfx || !certSenha) return NextResponse.json({ error: "falha ao cifrar o certificado" }, { status: 500 });

  await db.doctor.update({
    where: { id: doctorId },
    data: { certPfx, certSenha, certNome: f.name, certEm: new Date() },
  });

  return NextResponse.json({ ok: true, nome: f.name });
}

/** Remove o certificado do médico autenticado. */
export async function DELETE() {
  const doctorId = await getAuthedDoctorId();
  if (!doctorId) return NextResponse.json(NAO_AUTENTICADO, { status: 401 });

  await db.doctor.update({
    where: { id: doctorId },
    data: { certPfx: null, certSenha: null, certNome: null, certEm: null },
  });
  return NextResponse.json({ ok: true });
}
