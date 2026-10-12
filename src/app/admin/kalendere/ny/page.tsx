import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { defaultCalendarInput } from "@/lib/admin";
import { Loading } from "@/components/Loading";
import { CalendarForm } from "../../_components/CalendarForm";

export const metadata = { title: "Ny kalender" };

export default function NewCalendarPage() {
  return (
    <>
      <p className="crumbs">
        <Link href="/admin">Kalendere</Link>
      </p>
      <h1>Ny kalender</h1>
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
