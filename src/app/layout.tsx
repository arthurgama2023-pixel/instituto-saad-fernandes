import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Doctor — Clara",
  description: "Inteligência que cuida. Seu médico a uma mensagem de distância.",
  manifest: "/manifest.webmanifest",
  applicationName: "Smart Doctor",
  appleWebApp: { capable: true, title: "Smart Doctor", statusBarStyle: "default" },
  icons: { icon: "/appicon", apple: "/appicon" },
  // Next 16 emite só `mobile-web-app-capable`; o iOS ainda precisa do apple-prefixado.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B6EF5",
};

// Aplica o tema salvo (localStorage) antes de pintar, evitando flash de cor errada.
const THEME_INIT = `try{var t=localStorage.getItem('sd-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
