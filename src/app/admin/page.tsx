import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listCalendars } from "@/lib/calendar";
import { calendarStats } from "@/lib/admin";
import { formatDate } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.calendars.title };
}

const STATUS_CLASS: Record<string, string> = { draft: "warn", published: "ok", archived: "" };

export default function AdminHome() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminHomeContent />
    </Suspense>
  );
}

async function AdminHomeContent() {
  await requireAdmin("/admin");
  const t = await getT();
  const a = t.admin;
  const calendars = await listCalendars();
  const stats = await calendarStats(calendars.map((c) => c.id));
  return (
    <>
      <div className="panel-head">
        <h1>{a.calendars.title}</h1>
        <Link className="btn" href="/admin/kalendere/ny">
          {a.calendars.new}
        </Link>
      </div>
      {calendars.length === 0 ? (
        <p className="note">{a.calendars.empty}</p>
      ) : (
        <div className="panel tbl">
          <table>
            <thead>
              <tr>
                <th scope="col">{a.c.name}</th>
                <th scope="col">{a.c.status}</th>
                <th scope="col">{a.calendars.start}</th>
                <th scope="col" className="num">
                  {a.calendars.questions}
                </th>
                <th scope="col" className="num">
                  {a.calendars.approved}
                </th>
                <th scope="col" className="num">
                  {a.c.participants}
                </th>
                <th scope="col" className="num">
                  {a.c.answers}
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
                      <span className={`badge ${STATUS_CLASS[c.status]}`}>{a.status[c.status]}</span>
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
