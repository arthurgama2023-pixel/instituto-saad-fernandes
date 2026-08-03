import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/brand/Icon";

const PROFILES = [
  {
    href: "/paciente",
    icon: "person",
    title: "Paciente",
    desc: "Converse com a Clara pelo app, marque consultas, veja sua agenda, saúde e receitas.",
    cta: "Entrar como paciente",
  },
  {
    href: "/medico/login",
    icon: "stethoscope",
    title: "Médico",
    desc: "Dashboard, agenda do dia com resumo da Clara, pacientes e financeiro com repasses.",
    cta: "Entrar como médico",
  },
  {
    href: "/admin",
    icon: "shield_person",
    title: "Administrador",
    desc: "Visão geral, funil da Clara, GMV, fila de aprovação de médicos e financeiro.",
    cta: "Entrar como admin",
  },
];

export default function Portal() {
  return (
    <div className="brand-app min-h-screen bg-background text-on-background flex flex-col">
      <main className="flex-1 flex flex-col items-center px-6 py-14 max-w-[960px] mx-auto w-full">
        <div className="w-[76px] h-[76px] rounded-[22px] sd-aurora flex items-center justify-center brand-shadow mb-4">
          <Logo size={46} />
        </div>
        <h1 className="text-headline-lg font-headline-lg text-primary text-center">Smart Doctor</h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant mt-2 text-center">Inteligência que cuida.</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant/70 mt-3 text-center">
          Demo navegável · escolha um perfil para explorar
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 w-full">
          {PROFILES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest brand-shadow p-6 hover:border-secondary hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center">
                <Icon name={p.icon} className="text-on-secondary-container" size={24} />
              </div>
              <h2 className="text-headline-sm font-headline-sm text-primary">{p.title}</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant flex-1">{p.desc}</p>
              <span className="text-label-lg font-label-lg text-secondary flex items-center gap-1">
                {p.cta} <Icon name="arrow_forward" size={16} />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-body-sm font-body-sm text-on-surface-variant text-center mt-8">
          É médico e quer atender pela plataforma?{" "}
          <Link href="/medico/login" className="text-secondary font-semibold">
            Acesse a área do médico →
          </Link>
        </p>
      </main>
    </div>
  );
}
