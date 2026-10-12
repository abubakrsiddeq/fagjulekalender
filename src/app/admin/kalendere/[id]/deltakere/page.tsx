import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { getScoreboard } from "@/lib/leaderboard";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { CalendarAdminNav } from "../../../_components/CalendarAdminNav";

export const metadata = { title: "Deltakere" };

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
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLocaleLowerCase("nb") : "";
  const board = await getScoreboard(cal, { fresh: true });
  const rows = board.participants
    .filter(
      (p) =>
        !q ||
        [p.displayName, p.email, p.departmentName, p.kommune, p.bydel, p.ressursnummer, p.ansvarlig].some((v) => v?.toLocaleLowerCase("nb").includes(q)),
    )
    .sort((a, b) => a.departmentName.localeCompare(b.departmentName, "nb") || a.displayName.localeCompare(b.displayName, "nb"));

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="participants" />
      <div className="panel-head">
        <h1>Deltakere</h1>
        <span className="small">{board.participants.length} påmeldt</span>
      </div>
      <form className="inline-form" role="search">
        <label htmlFor="q" className="sr-only">
          Søk etter navn, e-post, avdeling, kommune eller ressursnummer
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Søk navn, e-post, avdeling, kommune, ressursnr." style={{ minWidth: 300 }} />
        <button className="btn ghost small" type="submit">
          Søk
        </button>
      </form>
      <section className="panel tbl">
        {rows.length === 0 ? (
          <p className="empty">Ingen treff.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Navn</th>
                <th scope="col">E-post</th>
                <th scope="col">Kommune / bydel</th>
                <th scope="col">Ressursnr.</th>
                <th scope="col">Avdeling</th>
                <th scope="col" className="num">
                  Besvart
                </th>
                <th scope="col" className="num">
                  Poeng
                </th>
                <th scope="col">Sist svart</th>
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
                    {p.departmentStatus !== "active" && <span className="badge warn"> {p.departmentStatus === "pending" ? "venter" : "arkivert"}</span>}
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
