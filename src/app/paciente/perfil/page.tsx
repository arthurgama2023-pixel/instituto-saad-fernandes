"use client";

import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { Avatar } from "@/components/brand/Avatar";
import { InstallApp } from "@/components/brand/InstallApp";
import { ErrorState, Loading } from "@/components/brand/ui";
import { usePatient } from "@/lib/patient-data";

const MENU = [
  { icon: "monitor_heart", label: "Doenças crônicas e alergias", href: "/paciente/perfil/saude" },
  { icon: "person", label: "Dados pessoais", href: "/paciente/perfil/dados" },
  { icon: "location_on", label: "Endereços", href: "/paciente/perfil/enderecos" },
  { icon: "credit_card", label: "Cartões de pagamento", href: "/paciente/perfil/cartoes" },
  { icon: "lock", label: "Segurança", href: "/paciente/perfil/seguranca" },
  { icon: "visibility_off", label: "Privacidade", href: "/paciente/perfil/privacidade" },
];

export default function PerfilPage() {
  const { data, error, reload } = usePatient();

  if (error && !data) return <ErrorState onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full flex justify-between items-center px-5 py-4">
        <h1 className="text-headline-sm font-headline-sm text-primary">Meu perfil</h1>
      </header>

      <main className="w-full max-w-md mx-auto px-5 pt-4 space-y-8">
        <section className="flex flex-col items-center text-center">
          <div className="mb-4">
            <Avatar name={data.name} size={96} />
          </div>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-1">{data.name}</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant">{data.phone ?? "Telefone não informado"}</p>
          <p className="text-body-sm font-body-sm text-on-surface-variant">Paciente · Smart Doctor</p>
        </section>

        <InstallApp />

        <nav className="bg-surface-container-lowest rounded-xl brand-shadow overflow-hidden border border-outline-variant/30 flex flex-col">
          {MENU.map((item, i) => {
            const content = (
              <>
                <span className="flex items-center gap-4">
                  <Icon name={item.icon} className="text-on-surface-variant group-hover:text-primary" />
                  <span className="text-label-lg font-label-lg text-on-surface">{item.label}</span>
                </span>
                <Icon name="chevron_right" className="text-outline-variant" />
              </>
            );
            return (
              <div key={item.label}>
                {i > 0 && <div className="h-px bg-outline-variant/30 mx-4" />}
                {item.href ? (
                  <Link href={item.href} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group">
                    {content}
                  </Link>
                ) : (
                  <button className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group">
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        <p className="text-body-sm font-body-sm text-on-surface-variant text-center px-2">
          Seus dados de saúde são sensíveis e protegidos pela LGPD. O prontuário é guardado por 20 anos por exigência
          do CFM, mesmo após a exclusão da conta.
        </p>

        <Link
          href="/api/auth/logout"
          className="w-full py-4 px-6 border border-error text-error text-label-lg font-label-lg rounded-xl hover:bg-error-container transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Icon name="logout" size={20} />
          SAIR DA CONTA
        </Link>
      </main>
    </>
  );
}
