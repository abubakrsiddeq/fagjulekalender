import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Figtree, Young_Serif } from "next/font/google";
import { InlineScript } from "@/components/InlineScript";
import { SiteHeader, SiteHeaderShell } from "@/components/SiteHeader";
import { t } from "@/i18n";
import "./globals.css";

// Fonts are downloaded at build time and served from this app, so browsers never contact Google.
const display = Young_Serif({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: t.appName, template: `%s · ${t.appName}` },
  description: "Daglig læringsøyeblikk fra 1. til 24. desember, med avdelingskonkurranse.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1714" },
  ],
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("fjk-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <a className="skip" href="#main">
          {t.nav.skipToContent}
        </a>
        <Suspense fallback={<SiteHeaderShell />}>
          <SiteHeader />
        </Suspense>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
