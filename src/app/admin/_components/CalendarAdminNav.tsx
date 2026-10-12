import Link from "next/link";

const ITEMS = [
  { key: "overview", path: "", label: "Oversikt" },
  { key: "questions", path: "/sporsmal", label: "Spørsmål" },
  { key: "preview", path: "/forhandsvisning", label: "Forhåndsvisning" },
  { key: "participants", path: "/deltakere", label: "Deltakere" },
  { key: "report", path: "/rapport", label: "Rapport og eksport" },
] as const;

export function CalendarAdminNav({ id, name, active }: { id: number; name: string; active: (typeof ITEMS)[number]["key"] }) {
  return (
    <>
      <p className="crumbs">
        <Link href="/admin">Kalendere</Link> / {name}
      </p>
      <nav className="tabs" aria-label="Kalender">
        {ITEMS.map((i) => (
          <Link key={i.key} href={`/admin/kalendere/${id}${i.path}`} aria-current={i.key === active ? "page" : undefined}>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
