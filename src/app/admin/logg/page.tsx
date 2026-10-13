import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.audit.title };
}

export default function AuditPage(props: PageProps<"/admin/logg">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

const ENTITIES = ["question", "calendar", "membership", "answer", "department", "user", "invite", "organization"];

function short(json: string | null): string {
  if (!json) return "";
  return json.length > 400 ? json.slice(0, 400) + "…" : json;
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/logg">["searchParams"] }) {
  await requireAdmin("/admin/logg");
  const l = (await getT()).admin.audit;
  const sp = await searchParams;
  const entity = typeof sp.type === "string" && ENTITIES.includes(sp.type) ? sp.type : "";
  const rows = await db.query<{
    id: number;
    at: Date;
    action: string;
    entity: string;
    entity_id: string | null;
    reason: string | null;
    before_data: string | null;
    after_data: string | null;
    actor: string | null;
  }>(
    `SELECT l.id, l.at, l.action, l.entity, l.entity_id, l.reason, l.before_data, l.after_data, u.display_name AS actor
       FROM audit_log l LEFT JOIN users u ON u.id = l.user_id
      WHERE (u.org_id = ? OR u.id IS NULL) AND (? = '' OR l.entity = ?)
      ORDER BY l.id DESC LIMIT 300`,
    [env.orgId, entity, entity],
  );

  return (
    <>
      <h1>{l.title}</h1>
      <p className="muted">{l.intro}</p>
      <form className="inline-form">
        <label htmlFor="type">{l.show}</label>
        <select id="type" name="type" defaultValue={entity}>
          <option value="">{l.all}</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button className="btn ghost small" type="submit">
          {l.filter}
        </button>
      </form>
      <section className="panel tbl">
        {rows.length === 0 ? (
          <p className="empty">{l.none}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">{l.time}</th>
                <th scope="col">{l.who}</th>
                <th scope="col">{l.event}</th>
                <th scope="col">{l.reason}</th>
                <th scope="col">{l.details}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>
                    {formatDateTime(r.at, "Europe/Oslo")}
                  </td>
                  <td>{r.actor ?? l.system}</td>
                  <td>
                    <code>{r.action}</code>
                    {r.entity_id && <div className="small">#{r.entity_id}</div>}
                  </td>
                  <td className="small">{r.reason}</td>
                  <td>
                    {(r.before_data || r.after_data) && (
                      <details>
                        <summary className="small">{l.show}</summary>
                        {r.before_data && (
                          <>
                            <p className="small">{l.before}</p>
                            <pre className="prewrap">{short(r.before_data)}</pre>
                          </>
                        )}
                        {r.after_data && (
                          <>
                            <p className="small">{l.after}</p>
                            <pre className="prewrap">{short(r.after_data)}</pre>
                          </>
                        )}
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
