// O cadastro do médico usa a identidade Smart Doctor (.brand-app: tokens verdes +
// Plus Jakarta), diferente do painel /medico, que ainda roda no CSS Pulse legado.
export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return <div className="brand-app min-h-screen pb-28">{children}</div>;
}
