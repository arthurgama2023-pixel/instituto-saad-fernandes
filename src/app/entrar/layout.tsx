// Login REAL do paciente (Supabase Auth, e-mail/telefone + senha), na
// identidade Smart Doctor (.brand-app). É a rota canônica de acesso do
// paciente: a home aponta pra cá e o /login demo (sem verificação de senha)
// foi aposentado — vira redirect pra cá.
export default function EntrarLayout({ children }: { children: React.ReactNode }) {
  return <div className="brand-app min-h-screen">{children}</div>;
}
