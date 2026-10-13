import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getOrg } from "@/lib/org";
import { signOut } from "@/app/actions";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Shown while the page streams in; no text that depends on the visitor. */
export function SiteHeaderShell() {
  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          <b>Fagjulekalender</b>
        </Link>
      </div>
    </header>
  );
}

export async function SiteHeader() {
  // Read the session first: it makes this component request-time only, so the
  // database is never queried during `next build`.
  const user = await getCurrentUser();
  const [org, t] = await Promise.all([getOrg(), getT()]);
  const brand = org.brand_color && HEX.test(org.brand_color) ? org.brand_color : null;
  const logo = org.logo_url && /^https:\/\//.test(org.logo_url) ? org.logo_url : null;

  return (
    <header className="site-header">
      {brand && <style>{`:root{--brand:${brand};--brand-dark:color-mix(in srgb, ${brand} 45%, #ffffff)}`}</style>}
      <div className="inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" />}
          <span style={{ display: "grid" }}>
            <b>{t.appName}</b>
            <span>{org.name}</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label={t.nav.mainMenu}>
          {user ? (
            <>
              <Link href="/profil">{t.nav.profile}</Link>
              {user.role === "admin" && <Link href="/admin">{t.nav.admin}</Link>}
              <form action={signOut}>
                <button type="submit" className="linkbtn">
                  {t.nav.signOut}
                </button>
              </form>
            </>
          ) : (
            <Link href="/logg-inn">{t.nav.signIn}</Link>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
