import Link from "next/link";
import { getT } from "@/i18n/server";

export async function CalendarNav({ slug, active, showLead }: { slug: string; active: "calendar" | "results" | "lead"; showLead: boolean }) {
  const t = await getT();
  const items = [
    { key: "calendar", href: `/kalender/${slug}`, label: t.nav.calendar },
    { key: "results", href: `/kalender/${slug}/resultater`, label: t.nav.results },
    ...(showLead ? [{ key: "lead", href: `/kalender/${slug}/min-avdeling`, label: t.nav.myDepartment }] : []),
  ];
  return (
    <nav className="tabs" aria-label={t.nav.calendarMenu}>
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={i.key === active ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
