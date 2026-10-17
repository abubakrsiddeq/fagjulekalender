import { AdminNav } from "./_components/AdminNav";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Fagjulekalender" } };

// Navigation only. Every admin page and action checks the admin role itself.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const n = (await getT()).admin.nav;
  return (
    <div className="wrap">
      <AdminNav
        label={n.label}
        items={[
          { href: "/admin", label: n.calendars },
          { href: "/admin/avdelinger", label: n.departments },
          { href: "/admin/brukere", label: n.users },
          { href: "/admin/innstillinger", label: n.settings },
          { href: "/admin/logg", label: n.log },
        ]}
      />
      {children}
    </div>
  );
}
