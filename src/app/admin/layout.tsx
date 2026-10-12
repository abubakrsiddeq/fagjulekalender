import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Fagjulekalender" } };

// Static navigation only. Every admin page and action checks the admin role itself.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="wrap">
      <nav className="admin-nav" aria-label="Administrasjon">
        <Link href="/admin">Kalendere</Link>
        <Link href="/admin/avdelinger">Avdelinger</Link>
        <Link href="/admin/brukere">Brukere og tilgang</Link>
        <Link href="/admin/innstillinger">Innstillinger</Link>
        <Link href="/admin/logg">Endringslogg</Link>
      </nav>
      {children}
    </div>
  );
}
