"use client";

import { useEffect, useState } from "react";

// Alterna claro/escuro gravando data-theme no <html> + localStorage.
// O tema salvo é aplicado antes de pintar pelo script inline no layout (sem flash).
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") {
      setTheme(attr);
    } else {
      setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("sd-theme", next);
    } catch {
      /* ignora storage indisponível */
    }
  };

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggle}
      title={theme === "dark" ? "Mudar para claro" : "Mudar para escuro"}
      aria-label="Alternar tema claro e escuro"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
