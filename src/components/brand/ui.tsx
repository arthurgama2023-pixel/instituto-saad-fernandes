"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md w-full flex items-center gap-2 px-5 py-4">
      <button
        aria-label="Voltar"
        onClick={() => router.back()}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
      >
        <Icon name="arrow_back" className="text-primary" />
      </button>
      <h1 className="text-headline-sm font-headline-sm text-primary flex-1">{title}</h1>
      {action ?? <div className="w-10" />}
    </header>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-on-surface-variant">
      <Icon name="progress_activity" className="animate-spin" size={32} />
      <p className="text-body-sm font-body-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
      <Icon name="cloud_off" className="text-on-tertiary-container" size={40} />
      <p className="text-body-md font-body-md text-on-surface-variant">
        Não consegui carregar seus dados. Verifique a conexão.
      </p>
      <button
        onClick={onRetry}
        className="bg-primary-container text-white px-6 py-3 rounded-xl text-label-lg font-label-lg active:scale-95 transition-transform"
      >
        TENTAR DE NOVO
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <Icon name={icon} className="text-on-tertiary-container" size={40} />
      <p className="text-body-md font-body-md text-on-surface">{title}</p>
      {hint && <p className="text-body-sm font-body-sm text-on-surface-variant max-w-xs">{hint}</p>}
    </div>
  );
}

const PILLS: Record<string, { label: string; className: string }> = {
  CONFIRMADA: { label: "Confirmada", className: "bg-green-50 border-green-200 text-green-700" },
  AGUARDANDO_PAGAMENTO: { label: "Aguardando", className: "bg-secondary-container/40 border-secondary-fixed-dim text-on-secondary-container" },
  CONCLUIDA: { label: "Concluída", className: "bg-surface-container border-outline-variant text-on-surface-variant" },
};

export function StatusPill({ status }: { status: string }) {
  const pill = PILLS[status] ?? {
    label: status.toLowerCase(),
    className: "bg-surface-container border-outline-variant text-on-surface-variant",
  };
  return (
    <span className={`px-3 py-1 rounded-full border text-[11px] font-bold shrink-0 ${pill.className}`}>
      {pill.label}
    </span>
  );
}
