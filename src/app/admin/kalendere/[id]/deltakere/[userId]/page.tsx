import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getMembership, pointsFor } from "@/lib/calendar";
import { listDepartments } from "@/lib/departments";
import { LETTERS } from "@/lib/answers";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { resetAnswer } from "../../../../actions";
import { CalendarAdminNav } from "../../../../_components/CalendarAdminNav";
import { MoveForm } from "../../../../_components/MoveForm";
import type { Role } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.participant.title };
}

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
  const a = (await getT()).admin;
  const pp = a.participant;
  const person = await db.queryOne<{
    id: number;
    email: string;
    display_name: string;
    role: Role;
    kommune: string | null;
    bydel: string | null;
    ressursnummer: string | null;
    ansvarlig: string | null;
  }>("SELECT id, email, display_name, role, kommune, bydel, ressursnummer, ansvarlig FROM users WHERE id = ? AND org_id = ?", [userId, env.orgId]);
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
  const total = answers.reduce((sum, x) => sum + pointsFor(cal, !!x.is_correct, !!x.on_door_day), 0);

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="participants" />
      <p className="crumbs">
        <Link href={`/admin/kalendere/${cal.id}/deltakere`}>{pp.all}</Link>
      </p>
      <h1>{person.display_name}</h1>
      <p className="muted">{pp.summary(person.email, a.roles[person.role], membership?.department_name ?? null, total)}</p>
      <p className="small">{pp.registration(person.kommune ?? "–", person.bydel ?? "–", person.ressursnummer ?? "–", person.ansvarlig ?? "–")}</p>

      <section className="panel" aria-labelledby="move-h">
        <h2 id="move-h">{pp.moveTitle}</h2>
        <p className="small">{pp.moveNote}</p>
        <MoveForm calendarId={cal.id} userId={userId} currentId={membership?.department_id ?? null} departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
      </section>

      <section className="panel tbl" aria-labelledby="ans-h">
        <h2 id="ans-h">{pp.answersTitle}</h2>
        {answers.length === 0 ? (
          <p className="empty">{pp.noAnswers}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">{a.editor.door}</th>
                <th scope="col">{pp.answer}</th>
                <th scope="col">{pp.result}</th>
                <th scope="col">{pp.time}</th>
                <th scope="col">{pp.reset}</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((x) => (
                <tr key={x.id}>
                  <td>{x.door_number}</td>
                  <td>
                    <b>{LETTERS[x.option_index]}</b> {x.option_text}
                  </td>
                  <td>
                    {x.is_correct ? <span className="badge ok">{pp.correct}</span> : <span className="badge bad">{pp.wrong}</span>}{" "}
                    {pp.pointsShort(pointsFor(cal, !!x.is_correct, !!x.on_door_day))}
                  </td>
                  <td className="small">{formatDateTime(x.answered_at, cal.timezone)}</td>
                  <td>
                    <form action={resetAnswer} className="inline-form">
                      <input type="hidden" name="calendar_id" value={cal.id} />
                      <input type="hidden" name="answer_id" value={x.id} />
                      <label className="sr-only" htmlFor={`reason-${x.id}`}>
                        {pp.resetReasonFor(x.door_number)}
                      </label>
                      <input id={`reason-${x.id}`} name="reason" type="text" placeholder={a.c.reason} required maxLength={500} />
                      <button className="btn ghost small" type="submit">
                        {pp.reset}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="small">{pp.resetNote}</p>
      </section>
    </>
  );
}
