import Link from "next/link";
import { getT } from "@/i18n/server";

const ITEMS = [
  { key: "overview", path: "" },
  { key: "questions", path: "/sporsmal" },
  { key: "preview", path: "/forhandsvisning" },
  { key: "participants", path: "/deltakere" },
  { key: "report", path: "/rapport" },
] as const;

export async function CalendarAdminNav({ id, name, active }: { id: number; name: string; active: (typeof ITEMS)[number]["key"] }) {
  const a = (await getT()).admin;
  return (
    <>
      <p className="crumbs">
        <Link href="/admin">{a.calendars.title}</Link> / {name}
      </p>
      <nav className="tabs" aria-label={a.calNav.label}>
        {ITEMS.map((i) => (
          <Link key={i.key} href={`/admin/kalendere/${id}${i.path}`} aria-current={i.key === active ? "page" : undefined}>
            {a.calNav[i.key]}
          </Link>
        ))}
      </nav>
    </>
  );
}
