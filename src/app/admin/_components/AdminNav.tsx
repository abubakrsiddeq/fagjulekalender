"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Admin section links; marks the current section for screen readers and styling. */
export function AdminNav({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const path = usePathname();
  const current = (href: string) => (href === "/admin" ? path === "/admin" || path.startsWith("/admin/kalendere") : path.startsWith(href));
  return (
    <nav className="admin-nav" aria-label={label}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={current(i.href) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
