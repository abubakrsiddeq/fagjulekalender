import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { listDepartments } from "@/lib/departments";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { setDepartmentStatus } from "../actions";
import { AddDepartmentForm, MergeForm, RenameForm } from "../_components/DepartmentForms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.departments.title };
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireAdmin("/admin/avdelinger");
  const a = (await getT()).admin;
  const d$ = a.departments;
  const departments = await listDepartments(["pending", "active", "archived"]);
  const counts = await db.query<{ department_id: number; n: number }>(
    `SELECT m.department_id, COUNT(*) AS n FROM memberships m JOIN calendars c ON c.id = m.calendar_id
      WHERE c.org_id = ? AND c.status <> 'archived' GROUP BY m.department_id`,
    [env.orgId],
  );
  const members = new Map(counts.map((c) => [c.department_id, Number(c.n)]));
  const order = { pending: 0, active: 1, archived: 2 } as const;
  departments.sort((x, y) => order[x.status] - order[y.status] || x.name.localeCompare(y.name, "nb"));

  return (
    <>
      <h1>{d$.title}</h1>
      <p className="muted">{d$.intro}</p>
      <section className="panel tbl">
        <table>
          <thead>
            <tr>
              <th scope="col">{a.c.department}</th>
              <th scope="col">{a.c.status}</th>
              <th scope="col" className="num">
                {d$.members}
              </th>
              <th scope="col">{a.c.actions}</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td>
                  <details>
                    <summary>{d.name}</summary>
                    <RenameForm id={d.id} name={d.name} />
                  </details>
                </td>
                <td>
                  <span className={`badge ${d.status === "active" ? "ok" : d.status === "pending" ? "warn" : ""}`}>{a.deptStatus[d.status]}</span>
                </td>
                <td className="num">{members.get(d.id) ?? 0}</td>
                <td>
                  <form action={setDepartmentStatus} className="inline-form">
                    <input type="hidden" name="department_id" value={d.id} />
                    {d.status === "active" ? (
                      <button className="btn ghost small" type="submit" name="status" value="archived">
                        {d$.archive}
                      </button>
                    ) : (
                      <button className="btn ghost small" type="submit" name="status" value="active">
                        {d.status === "pending" ? d$.approve : d$.restore}
                      </button>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="top">
        <section className="panel" aria-labelledby="add-h">
          <h2 id="add-h">{d$.addTitle}</h2>
          <AddDepartmentForm />
        </section>
        <section className="panel" aria-labelledby="merge-h">
          <h2 id="merge-h">{d$.mergeTitle}</h2>
          <MergeForm departments={departments.map((d) => ({ id: d.id, name: d.name, status: d.status }))} />
        </section>
      </div>
    </>
  );
}
