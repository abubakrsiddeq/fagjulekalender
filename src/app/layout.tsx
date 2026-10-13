import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Figtree, Young_Serif } from "next/font/google";
import { InlineScript } from "@/components/InlineScript";
import { LocaleRoot } from "@/components/LocaleRoot";
import { SiteHeader, SiteHeaderShell } from "@/components/SiteHeader";
import { getT } from "@/i18n/server";
import "./globals.css";

// Fonts are downloaded at build time and served from this app, so browsers never contact Google.
const display = Young_Serif({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t.appName, template: `%s · ${t.appName}` },
    description: t.meta.description,
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1714" },
  ],
};

// Runs before first paint: saved theme, and <html lang> from the language cookie
// (the <html> element itself is prerendered, so the server can't set it per visitor).
const HEAD_SCRIPT = `try{var t=localStorage.getItem("fjk-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}try{var m=document.cookie.match(/(?:^|;\\s*)fjk_lang=(en|nb)/);if(m)document.documentElement.lang=m[1]}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={HEAD_SCRIPT} />
      </head>
      <body>
        <Suspense fallback={<SiteHeaderShell />}>
          <LocaleRoot>
            <Suspense fallback={<SiteHeaderShell />}>
              <SiteHeader />
            </Suspense>
            <main id="main">{children}</main>
          </LocaleRoot>
        </Suspense>
      </body>
    </html>
  );
}
