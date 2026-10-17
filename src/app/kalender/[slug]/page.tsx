import Link from "next/link";
import { Suspense } from "react";
import { loadCalendarPage } from "@/lib/context";
import { canChangeDepartment, doorOpensAt, getUserProgress, isClosed, todayDoor, type DoorInfo } from "@/lib/calendar";
import { getScoreboard } from "@/lib/leaderboard";
import { formatDayMonth, formatDayMonthShort } from "@/lib/time";
import { CalendarNav } from "@/components/CalendarNav";
import { Loading } from "@/components/Loading";
import { ScrollTable } from "@/components/ScrollTable";
import { DepartmentPicker } from "./avdeling/DepartmentPicker";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n";

export default function CalendarPage(props: PageProps<"/kalender/[slug]">) {
  return (
    <div className="wrap">
      <Suspense fallback={<Loading />}>
        <CalendarContent params={props.params} />
      </Suspense>
    </div>
  );
}


async function CalendarContent({ params }: { params: PageProps<"/kalender/[slug]">["params"] }) {
  const { slug } = await params;
  const { user, cal, membership } = await loadCalendarPage(slug, `/kalender/${slug}`);
  const t = await getT();
  const fmt = (n: number) => n.toLocaleString(t.intl, { maximumFractionDigits: 1 });
  if (!membership && cal.status === "published") {
    return (
      <>
        <header className="page-head">
          <span className="eyebrow">{t.calendar.eyebrow(cal.year)}</span>
          <h1>{cal.name}</h1>
          <p>{t.department.intro}</p>
        </header>
        <section className="panel" aria-labelledby="join-h" style={{ maxWidth: 560 }}>
          <h2 id="join-h">{t.department.title}</h2>
          <DepartmentPicker slug={slug} cal={cal} user={user} membership={null} inline />
        </section>
      </>
    );
  }

  const now = new Date();
  const progress = await getUserProgress(cal, user.id, now);
  const board = await getScoreboard(cal);
  const today = todayDoor(cal, now);
  const todayInfo = today ? progress.doors[today - 1] : null;
  const myDept = membership ? board.departments.find((d) => d.departmentId === membership.department_id) : undefined;
  const myIndex = myDept ? board.departments.indexOf(myDept) : -1;
  const above = myDept && myIndex > 0 && board.departments[myIndex - 1].rank < myDept.rank ? board.departments[myIndex - 1] : undefined;

  let status: string;
  if (cal.status === "draft") status = t.calendar.draft;
  else if (isClosed(cal, now) || cal.status === "archived") status = t.calendar.closed;
  else if (today) status = t.calendar.todayDoor(today);
  else if (now < doorOpensAt(cal, 1)) status = t.calendar.beforeStart(`${formatDayMonth(cal.start_date, t.lang)} ${cal.year}`);
  else status = t.calendar.afterEnd;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">{t.calendar.eyebrow(cal.year)}</span>
        <h1>{cal.name}</h1>
        <p>{status}</p>
      </header>
      <CalendarNav slug={slug} active="calendar" showLead={!!membership && (user.role === "lead" || user.role === "admin")} />

      {cal.status === "draft" && (
        <p className="note">
          {t.calendar.draft} <Link href={`/admin/kalendere/${cal.id}/forhandsvisning`}>{t.calendar.previewInAdmin}</Link>.
        </p>
      )}

      <section className="top">
        <div className="panel" aria-labelledby="me-h">
          <h2 id="me-h">{t.calendar.participation}</h2>
          {membership ? (
            <p className="small">
              {t.calendar.competingFor} <b>{membership.department_name}</b>
              {membership.department_status === "pending" && ` (${t.department.pendingNote})`}
              {canChangeDepartment(cal, now) && (
                <>
                  {" · "}
                  <Link href={`/kalender/${slug}/avdeling`}>{t.department.change}</Link>
                </>
              )}
            </p>
          ) : (
            <p className="small">
              <Link href={`/kalender/${slug}/avdeling`}>{t.department.title}</Link>
            </p>
          )}
          <div className="stats">
            <div className="stat">
              <b>{progress.points}</b>
              <span>{t.calendar.points}</span>
            </div>
            <div className="stat">
              <b>{progress.correct}</b>
              <span>{t.calendar.correct}</span>
            </div>
            <div className="stat">
              <b>
                {progress.answered}/{cal.door_count}
              </b>
              <span>{t.calendar.answered}</span>
            </div>
          </div>
          {myDept && (
            <p className="small">
              {t.calendar.deptRank(myDept.rank, board.departments.length)}
              {" · "}
              {above ? t.calendar.gapAbove(fmt(above.average - myDept.average), above.name) : t.calendar.leading}
            </p>
          )}
          {todayInfo?.state === "ready" && (
            <Link className="btn" href={`/kalender/${slug}/luke/${today}`}>
              {t.calendar.openToday(today!)}
            </Link>
          )}
        </div>

        <div className="panel" aria-labelledby="lb-h">
          <div className="panel-head">
            <h2 id="lb-h">{t.results.title}</h2>
            <Link className="small" href={`/kalender/${slug}/resultater`}>
              {t.calendar.seeAll}
            </Link>
          </div>
          {board.departments.length === 0 ? (
            <p className="empty">{t.results.empty}</p>
          ) : (
            <ScrollTable label={t.results.title}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">{t.results.rank}</span>
                    </th>
                    <th scope="col">{t.results.department}</th>
                    <th scope="col" className="num">
                      {t.results.average}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {board.departments.slice(0, 5).map((d) => (
                    <tr key={d.departmentId} className={d.departmentId === membership?.department_id ? "mine" : undefined}>
                      <td className="rank">{d.rank}</td>
                      <td>
                        {d.name}
                        {d.departmentId === membership?.department_id && <span className="sr-only"> ({t.results.yourDepartment})</span>}
                      </td>
                      <td className="num">{fmt(d.average)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTable>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="doors-h">
        <div className="panel-head">
          <h2 id="doors-h">{t.calendar.doorsTitle}</h2>
          {today && <span className="small">{t.calendar.todayDoor(today)}</span>}
        </div>
        <ol className="doors">
          {progress.doors.map((d) => (
            <li key={d.door}>
              <Door slug={slug} info={d} t={t} />
            </li>
          ))}
        </ol>
        <div className="legend" aria-hidden="true">
          <span>{t.calendar.legendToday}</span>
          <span>{t.calendar.legendReady}</span>
          <span>{t.calendar.legendLocked}</span>
        </div>
      </section>
    </>
  );
}

function Door({ slug, info, t }: { slug: string; info: DoorInfo; t: Dictionary }) {
  const date = formatDayMonth(info.date, t.lang);
  const cls = `door ${info.state}${info.isToday ? " today" : ""}`;
  const srState = `${t.calendar.door} ${info.door}, ${t.calendar.state[info.state]}${info.state === "locked" ? `, ${t.calendar.opensOn(date)}` : ""}${
    info.isToday ? `, ${t.calendar.today}` : ""
  }`;
  let label: string;
  switch (info.state) {
    case "locked":
      label = formatDayMonthShort(info.date, t.lang);
      break;
    case "ready":
      label = info.topic ?? "";
      break;
    case "correct":
      label = t.calendar.plusPoints(info.points);
      break;
    case "wrong":
      label = t.calendar.wrongShort;
      break;
    case "missed":
      label = t.calendar.missedShort;
      break;
    default:
      label = "–";
  }
  const inner = (
    <>
      <span className="n" aria-hidden="true">
        {info.door}
      </span>
      <span className="t" aria-hidden="true">
        {label}
      </span>
      {info.state === "ready" && <span className="dot" aria-hidden="true" />}
      <span className="sr-only">{srState}</span>
    </>
  );
  if (info.state === "locked" || info.state === "empty") return <div className={cls}>{inner}</div>;
  return (
    <Link className={cls} href={`/kalender/${slug}/luke/${info.door}`} aria-current={info.isToday ? "date" : undefined}>
      {inner}
    </Link>
  );
}
