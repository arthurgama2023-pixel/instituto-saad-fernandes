// Cadastro do paciente na identidade Smart Doctor (.brand-app). Fica FORA de
// /paciente pelo mesmo motivo do /login: layouts aninham, e /paciente injeta
// a BottomNav, que não faz sentido antes do usuário ter conta.
export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return <div className="brand-app min-h-screen">{children}</div>;
}
