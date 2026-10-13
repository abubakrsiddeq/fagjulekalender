import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Fagjulekalender" } };

// Navigation only. Every admin page and action checks the admin role itself.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const n = (await getT()).admin.nav;
  return (
    <div className="wrap">
      <nav className="admin-nav" aria-label={n.label}>
        <Link href="/admin">{n.calendars}</Link>
        <Link href="/admin/avdelinger">{n.departments}</Link>
        <Link href="/admin/brukere">{n.users}</Link>
        <Link href="/admin/innstillinger">{n.settings}</Link>
        <Link href="/admin/logg">{n.log}</Link>
      </nav>
      {children}
    </div>
  );
}
