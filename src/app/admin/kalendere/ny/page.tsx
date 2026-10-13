import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { defaultCalendarInput } from "@/lib/admin";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { CalendarForm } from "../../_components/CalendarForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.calendars.new };
}

export default async function NewCalendarPage() {
  const a = (await getT()).admin;
  return (
    <>
      <p className="crumbs">
        <Link href="/admin">{a.calendars.title}</Link>
      </p>
      <h1>{a.calendars.new}</h1>
      <div className="panel">
        <Suspense fallback={<Loading />}>
          <NewCalendarForm />
        </Suspense>
      </div>
    </>
  );
}

async function NewCalendarForm() {
  await requireAdmin("/admin/kalendere/ny");
  return <CalendarForm initial={defaultCalendarInput(new Date())} />;
}
