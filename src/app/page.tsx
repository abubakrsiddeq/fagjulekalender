import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listCalendars } from "@/lib/calendar";
import { formatDayMonth } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { t } from "@/i18n";

export default function Home(props: PageProps<"/">) {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">{t.landing.eyebrow}</span>
        <h1>{t.landing.title}</h1>
        <p>{t.landing.intro}</p>
      </header>
      <Suspense fallback={<Loading />}>
        <HomeContent searchParams={props.searchParams} />
      </Suspense>
      <section className="panel" aria-labelledby="how-h">
        <h2 id="how-h">{t.landing.howTitle}</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
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
  const sp = await searchParams;
  const calendars = await listCalendars(["published"]);
  const noAccess = sp["ingen-tilgang"] === "1";

  if (!user) {
    const next = calendars.length === 1 ? `/kalender/${calendars[0].slug}` : "/";
    return (
      <div className="row">
        <Link className="btn" href={`/logg-inn?neste=${encodeURIComponent(next)}`}>
          {t.landing.signInCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      {noAccess && <p className="alert">{t.landing.noAccess}</p>}
      {calendars.length === 0 ? (
        <p className="note">{t.landing.noCalendars}</p>
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {calendars.map((c) => (
            <li key={c.id} className="panel">
              <div className="panel-head">
                <h2>{c.name}</h2>
                <span className="small">
                  {formatDayMonth(c.start_date)} {c.year}
                </span>
              </div>
              <div className="row">
                <Link className="btn" href={`/kalender/${c.slug}`}>
                  {t.landing.openCalendar}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
