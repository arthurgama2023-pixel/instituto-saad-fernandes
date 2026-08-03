// Login do médico na identidade Smart Doctor (.brand-app), como o cadastro —
// separado do painel /medico, que ainda usa o CSS Pulse legado.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="brand-app min-h-screen">{children}</div>;
}
