import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";

export const metadata = { title: "Endringslogg" };

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
      <h1>Endringslogg</h1>
      <p className="muted">Spørsmålsendringer, flytting av deltakere, nullstilte svar og andre administratorhandlinger. Viser de siste 300.</p>
      <form className="inline-form">
        <label htmlFor="type">Vis</label>
        <select id="type" name="type" defaultValue={entity}>
          <option value="">Alt</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button className="btn ghost small" type="submit">
          Filtrer
        </button>
      </form>
      <section className="panel tbl">
        {rows.length === 0 ? (
          <p className="empty">Ingen hendelser.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Tid</th>
                <th scope="col">Hvem</th>
                <th scope="col">Hendelse</th>
                <th scope="col">Begrunnelse</th>
                <th scope="col">Detaljer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>
                    {formatDateTime(r.at, "Europe/Oslo")}
                  </td>
                  <td>{r.actor ?? "System"}</td>
                  <td>
                    <code>{r.action}</code>
                    {r.entity_id && <div className="small">#{r.entity_id}</div>}
                  </td>
                  <td className="small">{r.reason}</td>
                  <td>
                    {(r.before_data || r.after_data) && (
                      <details>
                        <summary className="small">Vis</summary>
                        {r.before_data && (
                          <>
                            <p className="small">Før:</p>
                            <pre className="prewrap">{short(r.before_data)}</pre>
                          </>
                        )}
                        {r.after_data && (
                          <>
                            <p className="small">Etter:</p>
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
