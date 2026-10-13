import { Suspense } from "react";
import type { Metadata } from "next";
import { loadCalendarPage } from "@/lib/context";
import { getScoreboard, topParticipants } from "@/lib/leaderboard";
import { localHm } from "@/lib/time";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CalendarNav } from "@/components/CalendarNav";
import { DepartmentTable, TopTable } from "@/components/Leaderboards";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.results.title };
}

export default function ResultsPage(props: PageProps<"/kalender/[slug]/resultater">) {
  return (
    <div className="wrap">
      <Suspense fallback={<Loading />}>
        <ResultsContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ResultsContent({ params }: { params: PageProps<"/kalender/[slug]/resultater">["params"] }) {
  const { slug } = await params;
  const { user, cal, membership } = await loadCalendarPage(slug, `/kalender/${slug}/resultater`);
  const board = await getScoreboard(cal);
  const t = await getT();
  const top = topParticipants(board, 15, t.results.hidden);

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">{cal.name}</span>
        <h1>{t.results.title}</h1>
        <p>
          {t.results.subtitle}. {t.results.countNote(cal.min_answers_to_count)}
        </p>
      </header>
      <CalendarNav slug={slug} active="results" showLead={!!membership && (user.role === "lead" || user.role === "admin")} />
      <section className="panel" aria-labelledby="dept-h">
        <div className="panel-head">
          <h2 id="dept-h">{t.results.title}</h2>
          <span className="small">{t.results.updated(localHm(board.computedAt, cal.timezone))}</span>
        </div>
        <DepartmentTable departments={board.departments} mine={membership?.department_id} />
      </section>
      <section className="panel" aria-labelledby="top-h">
        <div className="panel-head">
          <h2 id="top-h">{t.results.topTitle}</h2>
          <span className="small">{t.results.topSubtitle}</span>
        </div>
        <TopTable entries={top} me={user.id} />
      </section>
      <AutoRefresh seconds={30} />
    </>
  );
}
