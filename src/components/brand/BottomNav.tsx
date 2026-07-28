"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const ITEMS = [
  { href: "/paciente", icon: "home", label: "Início" },
  { href: "/paciente/consultas", icon: "calendar_month", label: "Consultas" },
  { href: "/paciente/urgencia", icon: "bolt", label: "Urgência" },
  { href: "/paciente/exames", icon: "description", label: "Exames" },
  { href: "/paciente/perfil", icon: "person", label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();

  // O fluxo de agendamento tem a própria barra de ação fixa no rodapé.
  if (pathname.startsWith("/paciente/agendar")) return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pt-2 pb-6 px-2 bg-surface-container-lowest border-t border-outline-variant shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
      {ITEMS.map((item) => {
        const active = item.href === "/paciente" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center transition-colors ${
              active ? "text-primary font-semibold" : "text-on-tertiary-container hover:text-primary"
            }`}
          >
            <Icon name={item.icon} filled={active} />
            <span className="text-label-md font-label-md mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
