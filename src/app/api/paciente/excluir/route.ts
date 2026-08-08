import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/session";
import { COOKIE } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * Exclui a conta do paciente e seus dados desvinculáveis (endereços, cartões).
 * Consultas e documentos clínicos NÃO são apagados: o CFM exige guarda do
 * prontuário por 20 anos. Eles são anonimizados desvinculando o nome, mas o
 * registro clínico permanece — por isso não usamos cascade no User inteiro.
 */
export async function POST() {
  const user = await getDemoUser();

  // Apaga o que é puramente do paciente e não é registro clínico.
  await db.address.deleteMany({ where: { userId: user.id } });
  await db.paymentCard.deleteMany({ where: { userId: user.id } });

  // Anonimiza a conta em vez de deletar (preserva integridade do prontuário).
  await db.user.update({
    where: { id: user.id },
    data: {
      name: "Conta excluída",
      email: null,
      phone: null,
      googleId: null,
      image: null,
      condicoesCronicas: null,
      alergias: null,
    },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
