import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getMembership, pointsFor } from "@/lib/calendar";
import { listDepartments } from "@/lib/departments";
import { LETTERS } from "@/lib/answers";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { resetAnswer } from "../../../../actions";
import { CalendarAdminNav } from "../../../../_components/CalendarAdminNav";
import { MoveForm } from "../../../../_components/MoveForm";

export const metadata = { title: "Deltaker" };

export default function ParticipantPage(props: PageProps<"/admin/kalendere/[id]/deltakere/[userId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/kalendere/[id]/deltakere/[userId]">["params"] }) {
  const { id, userId: userParam } = await params;
  await requireAdmin(`/admin/kalendere/${id}/deltakere/${userParam}`);
  const cal = await requireCalendar(id);
  const userId = Number(userParam);
  if (!cal || !Number.isInteger(userId)) notFound();
  const person = await db.queryOne<{ id: number; email: string; display_name: string; role: string }>(
    "SELECT id, email, display_name, role FROM users WHERE id = ? AND org_id = ?",
    [userId, env.orgId],
  );
  if (!person) notFound();
  const [membership, departments, answers] = await Promise.all([
    getMembership(cal.id, userId),
    listDepartments(["active"]),
    db.query<{ id: number; door_number: number; option_id: number; is_correct: number; on_door_day: number; answered_at: Date; option_text: string; option_index: number }>(
      `SELECT a.id, q.door_number, a.option_id, a.is_correct, a.on_door_day, a.answered_at, o.text AS option_text,
              (SELECT COUNT(*) FROM question_options o2 WHERE o2.question_id = q.id AND (o2.sort_order < o.sort_order OR (o2.sort_order = o.sort_order AND o2.id < o.id))) AS option_index
         FROM answers a JOIN questions q ON q.id = a.question_id JOIN question_options o ON o.id = a.option_id
        WHERE a.calendar_id = ? AND a.user_id = ? ORDER BY q.door_number`,
      [cal.id, userId],
    ),
  ]);
  const total = answers.reduce((sum, a) => sum + pointsFor(cal, !!a.is_correct, !!a.on_door_day), 0);

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="participants" />
      <p className="crumbs">
        <Link href={`/admin/kalendere/${cal.id}/deltakere`}>Alle deltakere</Link>
      </p>
      <h1>{person.display_name}</h1>
      <p className="muted">
        {person.email} · rolle: {person.role} · {membership ? `avdeling: ${membership.department_name}` : "ingen avdeling i denne kalenderen"} · {total} poeng
      </p>

      <section className="panel" aria-labelledby="move-h">
        <h2 id="move-h">Flytt til annen avdeling</h2>
        <p className="small">Poengene følger deltakeren til den nye avdelingen. Flyttingen logges.</p>
        <MoveForm calendarId={cal.id} userId={userId} currentId={membership?.department_id ?? null} departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      </section>

      <section className="panel tbl" aria-labelledby="ans-h">
        <h2 id="ans-h">Svar</h2>
        {answers.length === 0 ? (
          <p className="empty">Ingen svar ennå.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Luke</th>
                <th scope="col">Svar</th>
                <th scope="col">Resultat</th>
                <th scope="col">Tidspunkt</th>
                <th scope="col">Nullstill</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((a) => (
                <tr key={a.id}>
                  <td>{a.door_number}</td>
                  <td>
                    <b>{LETTERS[a.option_index]}</b> {a.option_text}
                  </td>
                  <td>
                    {a.is_correct ? <span className="badge ok">Riktig</span> : <span className="badge bad">Feil</span>} {pointsFor(cal, !!a.is_correct, !!a.on_door_day)} p
                  </td>
                  <td className="small">{formatDateTime(a.answered_at, cal.timezone)}</td>
                  <td>
                    <form action={resetAnswer} className="inline-form">
                      <input type="hidden" name="calendar_id" value={cal.id} />
                      <input type="hidden" name="answer_id" value={a.id} />
                      <label className="sr-only" htmlFor={`reason-${a.id}`}>
                        Begrunnelse for nullstilling av luke {a.door_number}
                      </label>
                      <input id={`reason-${a.id}`} name="reason" type="text" placeholder="Begrunnelse" required maxLength={500} />
                      <button className="btn ghost small" type="submit">
                        Nullstill
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="small">Når et svar nullstilles, kan deltakeren svare på luken på nytt.</p>
      </section>
    </>
  );
}
