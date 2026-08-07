// Login REAL (Supabase Auth, telefone/OTP), na identidade Smart Doctor
// (.brand-app). Rota nova e aditiva — não substitui o /login demo ainda; a
// troca acontece no wiring nativo, depois que a camada de dados migrar.
export default function EntrarLayout({ children }: { children: React.ReactNode }) {
  return <div className="brand-app min-h-screen">{children}</div>;
}
