import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { getScoreboard } from "@/lib/leaderboard";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { CalendarAdminNav } from "../../../_components/CalendarAdminNav";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.participants.title };
}

export default function ParticipantsPage(props: PageProps<"/admin/kalendere/[id]/deltakere">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/kalendere/[id]/deltakere">["params"];
  searchParams: PageProps<"/admin/kalendere/[id]/deltakere">["searchParams"];
}) {
  const { id } = await params;
  await requireAdmin(`/admin/kalendere/${id}/deltakere`);
  const cal = await requireCalendar(id);
  if (!cal) notFound();
  const a = (await getT()).admin;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLocaleLowerCase("nb") : "";
  const board = await getScoreboard(cal, { fresh: true });
  const rows = board.participants
    .filter(
      (p) =>
        !q ||
        [p.displayName, p.email, p.departmentName, p.kommune, p.bydel, p.ressursnummer, p.ansvarlig].some((v) => v?.toLocaleLowerCase("nb").includes(q)),
    )
    .sort((x, y) => x.departmentName.localeCompare(y.departmentName, "nb") || x.displayName.localeCompare(y.displayName, "nb"));

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="participants" />
      <div className="panel-head">
        <h1>{a.participants.title}</h1>
        <span className="small">{a.participants.count(board.participants.length)}</span>
      </div>
      <form className="inline-form" role="search">
        <label htmlFor="q" className="sr-only">
          {a.participants.searchLabel}
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder={a.participants.searchPlaceholder} style={{ minWidth: 300 }} />
        <button className="btn ghost small" type="submit">
          {a.c.search}
        </button>
      </form>
      <section className="panel tbl">
        {rows.length === 0 ? (
          <p className="empty">{a.c.noHits}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">{a.c.name}</th>
                <th scope="col">{a.c.email}</th>
                <th scope="col">{a.c.kommuneBydel}</th>
                <th scope="col">{a.c.ressursnr}</th>
                <th scope="col">{a.c.department}</th>
                <th scope="col" className="num">
                  {a.c.answered}
                </th>
                <th scope="col" className="num">
                  {a.c.points}
                </th>
                <th scope="col">{a.c.lastAnswer}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.userId}>
                  <td>
                    <Link href={`/admin/kalendere/${cal.id}/deltakere/${p.userId}`}>{p.displayName}</Link>
                  </td>
                  <td className="small">{p.email}</td>
                  <td className="small">{[p.kommune, p.bydel].filter(Boolean).join(" / ") || "–"}</td>
                  <td className="small">{p.ressursnummer ?? "–"}</td>
                  <td>
                    {p.departmentName}
                    {p.departmentStatus !== "active" && (
                      <span className="badge warn"> {p.departmentStatus === "pending" ? a.deptStatus.pendingShort : a.deptStatus.archivedShort}</span>
                    )}
                  </td>
                  <td className="num">{p.answered}</td>
                  <td className="num">{p.points}</td>
                  <td className="small">{formatDateTime(p.lastAnswerAt, cal.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
