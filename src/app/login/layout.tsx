// Login do paciente na identidade Smart Doctor (.brand-app). Fica FORA de
// /paciente de propósito: aquele layout injeta a BottomNav, e layouts aninham
// (não substituem), então um login sob /paciente viria com a barra do app.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="brand-app min-h-screen">{children}</div>;
}
