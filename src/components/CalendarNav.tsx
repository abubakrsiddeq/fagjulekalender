import Link from "next/link";
import { t } from "@/i18n";

export function CalendarNav({ slug, active, showLead }: { slug: string; active: "calendar" | "results" | "lead"; showLead: boolean }) {
  const items = [
    { key: "calendar", href: `/kalender/${slug}`, label: t.nav.calendar },
    { key: "results", href: `/kalender/${slug}/resultater`, label: t.nav.results },
    ...(showLead ? [{ key: "lead", href: `/kalender/${slug}/min-avdeling`, label: t.nav.myDepartment }] : []),
  ];
  return (
    <nav className="tabs" aria-label="Kalender">
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={i.key === active ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
