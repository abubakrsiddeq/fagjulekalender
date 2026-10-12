import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { listCalendars } from "@/lib/calendar";
import { calendarStats } from "@/lib/admin";
import { formatDate } from "@/lib/time";
import { Loading } from "@/components/Loading";

export const metadata = { title: "Kalendere" };

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Utkast", cls: "warn" },
  published: { label: "Publisert", cls: "ok" },
  archived: { label: "Arkivert", cls: "" },
};

export default function AdminHome() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminHomeContent />
    </Suspense>
  );
}

async function AdminHomeContent() {
  await requireAdmin("/admin");
  const calendars = await listCalendars();
  const stats = await calendarStats(calendars.map((c) => c.id));
  return (
    <>
      <div className="panel-head">
        <h1>Kalendere</h1>
        <Link className="btn" href="/admin/kalendere/ny">
          Ny kalender
        </Link>
      </div>
      {calendars.length === 0 ? (
        <p className="note">Ingen kalendere ennå. Opprett en, eller importer database/seed.sql.</p>
      ) : (
        <div className="panel tbl">
          <table>
            <thead>
              <tr>
                <th scope="col">Navn</th>
                <th scope="col">Status</th>
                <th scope="col">Start</th>
                <th scope="col" className="num">
                  Spørsmål
                </th>
                <th scope="col" className="num">
                  Godkjent
                </th>
                <th scope="col" className="num">
                  Deltakere
                </th>
                <th scope="col" className="num">
                  Svar
                </th>
              </tr>
            </thead>
            <tbody>
              {calendars.map((c) => {
                const s = stats.get(c.id)!;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/kalendere/${c.id}`}>{c.name}</Link>
                      <div className="small">/kalender/{c.slug}</div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                    </td>
                    <td>{formatDate(c.start_date)}</td>
                    <td className="num">
                      {s.questions}/{c.door_count}
                    </td>
                    <td className="num">{s.approved}</td>
                    <td className="num">{s.members}</td>
                    <td className="num">{s.answers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
