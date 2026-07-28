"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferredPrompt(null);
      setShowSheet(false);
    };
    setStandalone(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      // Sem prompt nativo (iOS, ou HTTP sem service worker): resta instruir.
      setShowSheet(true);
      return;
    }
    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* o navegador já decidiu por conta própria */
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return (
    <>
      <section className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 brand-shadow">
        <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
          <Icon name="install_mobile" className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-label-lg font-label-lg text-primary">O Instituto como app</p>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            {standalone
              ? "Instalado neste dispositivo."
              : "Adicione à tela inicial e abra em tela cheia."}
          </p>
        </div>
        {standalone ? (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full border border-green-200 bg-green-50 text-[11px] font-bold text-green-700 shrink-0">
            <Icon name="check" size={14} /> Instalado
          </span>
        ) : (
          <button
            onClick={install}
            className="bg-primary text-on-primary px-4 py-2 rounded-full text-label-md font-label-md shrink-0 active:scale-95 transition-transform"
          >
            INSTALAR
          </button>
        )}
      </section>

      {showSheet && <InstallSheet onClose={() => setShowSheet(false)} />}
    </>
  );
}

function InstallSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  const steps: { icon: string; text: React.ReactNode }[] = isIOS
    ? [
        { icon: "ios_share", text: <>Toque no botão <strong>Compartilhar</strong> na barra do Safari.</> },
        { icon: "add_box", text: <>Escolha <strong>“Adicionar à Tela de Início”</strong>.</> },
        { icon: "check_circle", text: <>Toque em <strong>Adicionar</strong> — pronto, vira um app.</> },
      ]
    : isAndroid
      ? [
          { icon: "more_vert", text: <>Abra o menu <strong>⋮</strong> do navegador.</> },
          { icon: "install_mobile", text: <>Escolha <strong>“Instalar app”</strong> ou <strong>“Adicionar à tela inicial”</strong>.</> },
          { icon: "check_circle", text: <>Confirme — o ícone aparece junto dos seus apps.</> },
        ]
      : [
          { icon: "install_desktop", text: <>No Chrome ou Edge, clique no ícone <strong>Instalar</strong> na barra de endereço.</> },
          { icon: "more_vert", text: <>Ou abra o menu <strong>⋮</strong> → <strong>“Instalar Instituto Saad Fernandes”</strong>.</> },
        ];

  return (
    // Só o overlay anima (fade). Animar `transform` na folha travava o estado
    // inicial em alguns navegadores, jogando-a para fora da tela.
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/40 flex flex-col justify-end animate-[overlayIn_.18s_ease-out]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest rounded-t-[20px] px-5 pt-3 pb-8 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-outline-variant mx-auto mb-5" />

        <h2 id="install-sheet-title" className="text-headline-sm font-headline-sm text-primary mb-2">
          Instalar o app
        </h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-6">
          Tenha o Instituto na tela inicial, abrindo em tela cheia como um aplicativo.
        </p>

        <ol className="space-y-4 mb-8">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                <Icon name={step.icon} className="text-secondary" size={18} />
              </span>
              <span className="text-body-md font-body-md text-on-surface-variant pt-1">{step.text}</span>
            </li>
          ))}
        </ol>

        <button
          onClick={onClose}
          className="w-full h-14 bg-primary-container text-white text-label-lg font-label-lg rounded-xl active:scale-95 transition-transform"
        >
          ENTENDI
        </button>
      </div>
    </div>
  );
}
