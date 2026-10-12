import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { listDepartments } from "@/lib/departments";
import { Loading } from "@/components/Loading";
import { setDepartmentStatus } from "../actions";
import { AddDepartmentForm, MergeForm, RenameForm } from "../_components/DepartmentForms";

export const metadata = { title: "Avdelinger" };

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

const LABEL = { active: "Aktiv", pending: "Venter på godkjenning", archived: "Arkivert" } as const;

async function Content() {
  await requireAdmin("/admin/avdelinger");
  const departments = await listDepartments(["pending", "active", "archived"]);
  const counts = await db.query<{ department_id: number; n: number }>(
    `SELECT m.department_id, COUNT(*) AS n FROM memberships m JOIN calendars c ON c.id = m.calendar_id
      WHERE c.org_id = ? AND c.status <> 'archived' GROUP BY m.department_id`,
    [env.orgId],
  );
  const members = new Map(counts.map((c) => [c.department_id, Number(c.n)]));
  const order = { pending: 0, active: 1, archived: 2 } as const;
  departments.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, "nb"));

  return (
    <>
      <h1>Avdelinger</h1>
      <p className="muted">Avdelingene gjelder for alle kalendere. Forslag fra deltakere vises øverst til de er godkjent.</p>
      <section className="panel tbl">
        <table>
          <thead>
            <tr>
              <th scope="col">Avdeling</th>
              <th scope="col">Status</th>
              <th scope="col" className="num">
                Medlemmer
              </th>
              <th scope="col">Handlinger</th>
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
                  <span className={`badge ${d.status === "active" ? "ok" : d.status === "pending" ? "warn" : ""}`}>{LABEL[d.status]}</span>
                </td>
                <td className="num">{members.get(d.id) ?? 0}</td>
                <td>
                  <form action={setDepartmentStatus} className="inline-form">
                    <input type="hidden" name="department_id" value={d.id} />
                    {d.status === "active" ? (
                      <button className="btn ghost small" type="submit" name="status" value="archived">
                        Arkiver
                      </button>
                    ) : (
                      <button className="btn ghost small" type="submit" name="status" value="active">
                        {d.status === "pending" ? "Godkjenn" : "Gjenopprett"}
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
          <h2 id="add-h">Legg til</h2>
          <AddDepartmentForm />
        </section>
        <section className="panel" aria-labelledby="merge-h">
          <h2 id="merge-h">Slå sammen duplikater</h2>
          <MergeForm departments={departments.map((d) => ({ id: d.id, name: d.name, status: d.status }))} />
        </section>
      </div>
    </>
  );
}
