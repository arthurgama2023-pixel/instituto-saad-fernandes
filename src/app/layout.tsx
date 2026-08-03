import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Doctor",
  description: "Consulta online com médico de verdade: agende em minutos ou chame atendimento de urgência.",
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
  themeColor: "#0a1420",
};

// Aplica o tema salvo (localStorage) antes de pintar, evitando flash de cor errada.
const THEME_INIT = `try{var t=localStorage.getItem('sd-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
