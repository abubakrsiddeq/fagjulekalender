import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listCalendars } from "@/lib/calendar";
import { formatDayMonth } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";

export default async function Home(props: PageProps<"/">) {
  const t = await getT();
  return (
    <div className="wrap">
      <section className="hero">
        <div className="stack">
          <header className="page-head">
            <span className="eyebrow">{t.landing.eyebrow}</span>
            <h1>{t.landing.title}</h1>
            <p>{t.landing.intro}</p>
          </header>
          <Suspense fallback={<Loading />}>
            <HomeContent searchParams={props.searchParams} />
          </Suspense>
        </div>
        <div className="hero-art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/symbol.png" alt="" width={128} height={128} />
        </div>
      </section>
      <section className="panel" aria-labelledby="how-h">
        <h2 id="how-h">{t.landing.howTitle}</h2>
        <ol className="steps">
          {t.landing.how.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const user = await getCurrentUser();
  const t = await getT();
  const sp = await searchParams;
  const calendars = await listCalendars(["published"]);
  const noAccess = sp["ingen-tilgang"] === "1";

  if (!user) {
    const next = calendars.length === 1 ? `/kalender/${calendars[0].slug}` : "/";
    return (
      <div className="row cta">
        <Link className="btn" href={`/logg-inn?neste=${encodeURIComponent(next)}`}>
          {t.landing.signInCta} →
        </Link>
      </div>
    );
  }

  return (
    <div className="stack cta">
      {noAccess && <p className="alert">{t.landing.noAccess}</p>}
      {calendars.length === 0 ? (
        <p className="note">{t.landing.noCalendars}</p>
      ) : (
        <ul className="cal-list">
          {calendars.map((c) => (
            <li key={c.id} className="panel cal-card">
              <div className="stack" style={{ gap: 4 }}>
                <span className="small">
                  {formatDayMonth(c.start_date, t.lang)} {c.year}
                </span>
                <h2>{c.name}</h2>
              </div>
              <div className="row">
                <Link className="btn" href={`/kalender/${c.slug}`}>
                  {t.landing.openCalendar} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
