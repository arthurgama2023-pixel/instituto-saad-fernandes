import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instituto Saad Fernandes",
  description: "Cuidado médico exclusivo em tricologia, dermatologia e clínica geral.",
  manifest: "/manifest.webmanifest",
  applicationName: "Instituto Saad Fernandes",
  appleWebApp: { capable: true, title: "Saad Fernandes", statusBarStyle: "default" },
  icons: { icon: "/appicon", apple: "/appicon" },
  // Next 16 emite só `mobile-web-app-capable`; o iOS ainda precisa do apple-prefixado.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c1c31",
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
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Noto+Serif:wght@600;700&display=swap"
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
