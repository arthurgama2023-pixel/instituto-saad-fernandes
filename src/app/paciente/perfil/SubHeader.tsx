"use client";

import Link from "next/link";
import { Icon } from "@/components/brand/Icon";

/** Cabeçalho padrão das subtelas do perfil (título + voltar). */
export function SubHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full flex items-center gap-3 px-5 py-4">
      <Link
        href="/paciente/perfil"
        aria-label="Voltar"
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors -ml-2"
      >
        <Icon name="arrow_back_ios_new" className="text-primary" size={20} />
      </Link>
      <h1 className="text-headline-sm font-headline-sm text-primary">{title}</h1>
    </header>
  );
}
