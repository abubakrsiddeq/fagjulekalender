import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { loadCalendarPage } from "@/lib/context";
import { Loading } from "@/components/Loading";
import { DepartmentPicker } from "./DepartmentPicker";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.department.title };

export default function DepartmentPage(props: PageProps<"/kalender/[slug]/avdeling">) {
  return (
    <div className="wrap narrow">
      <Suspense fallback={<Loading />}>
        <DepartmentContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function DepartmentContent({ params }: { params: PageProps<"/kalender/[slug]/avdeling">["params"] }) {
  const { slug } = await params;
  const { user, cal, membership } = await loadCalendarPage(slug, `/kalender/${slug}/avdeling`);
  return (
    <>
      <p className="crumbs">
        <Link href={`/kalender/${slug}`}>{cal.name}</Link>
      </p>
      <h1>{t.department.title}</h1>
      <p className="muted">{t.department.intro}</p>
      <div className="panel">
        <DepartmentPicker slug={slug} cal={cal} user={user} membership={membership} inline={false} />
      </div>
    </>
  );
}
