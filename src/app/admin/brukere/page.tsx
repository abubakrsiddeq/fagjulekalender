import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { allowedDomains, getOrg } from "@/lib/org";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { anonymizeUser, removeInvite, setUserRole } from "../actions";
import { InviteForm } from "../_components/InviteForm";
import type { Role } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.users.title };
}

export default function UsersPage(props: PageProps<"/admin/brukere">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

const ROLES: Role[] = ["participant", "lead", "admin"];

async function Content({ searchParams }: { searchParams: PageProps<"/admin/brukere">["searchParams"] }) {
  const admin = await requireAdmin("/admin/brukere");
  const a = (await getT()).admin;
  const u$ = a.users;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const users = await db.query<{
    id: number;
    email: string;
    display_name: string;
    role: Role;
    kommune: string | null;
    bydel: string | null;
    ressursnummer: string | null;
    registered_at: Date | null;
    last_login_at: Date | null;
  }>(
    `SELECT id, email, display_name, role, kommune, bydel, ressursnummer, registered_at, last_login_at FROM users
      WHERE org_id = ? AND anonymized_at IS NULL AND (? = '' OR email LIKE ? OR display_name LIKE ? OR ressursnummer LIKE ?)
      ORDER BY role = 'admin' DESC, role = 'lead' DESC, display_name LIMIT 300`,
    [env.orgId, q, like, like, like],
  );
  const invites = await db.query<{ email: string; created_at: Date }>("SELECT email, created_at FROM invites WHERE org_id = ? ORDER BY email", [env.orgId]);
  const org = await getOrg();
  const domains = allowedDomains(org);

  return (
    <>
      <h1>{u$.title}</h1>

      <section className="panel" aria-labelledby="rule-h">
        <h2 id="rule-h">{u$.whoTitle}</h2>
        <p>
          {domains.length ? u$.whoDomains(domains.map((d) => "@" + d).join(", "), invites.length) : invites.length ? u$.whoInvites(invites.length) : u$.whoOpen}{" "}
          {u$.whoNote} <Link href="/admin/innstillinger">{u$.settingsLink}</Link>.
        </p>
      </section>

      <section className="panel" aria-labelledby="users-h">
        <div className="panel-head">
          <h2 id="users-h">{u$.usersTitle}</h2>
          <form className="inline-form" role="search">
            <label htmlFor="q" className="sr-only">
              {u$.searchLabel}
            </label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder={u$.searchPlaceholder} />
            <button className="btn ghost small" type="submit">
              {a.c.search}
            </button>
          </form>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th scope="col">{a.c.name}</th>
                <th scope="col">{a.c.email}</th>
                <th scope="col">{a.c.kommuneBydel}</th>
                <th scope="col">{a.c.ressursnr}</th>
                <th scope="col">{u$.role}</th>
                <th scope="col">{u$.lastLogin}</th>
                <th scope="col">
                  <span className="sr-only">{u$.privacy}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.display_name}</td>
                  <td className="small">{u.email}</td>
                  <td className="small">
                    {u.registered_at ? [u.kommune, u.bydel].filter(Boolean).join(" / ") : <span className="badge warn">{a.c.notRegistered}</span>}
                  </td>
                  <td className="small">{u.ressursnummer ?? "–"}</td>
                  <td>
                    <form action={setUserRole} className="inline-form">
                      <input type="hidden" name="user_id" value={u.id} />
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        {u$.roleFor(u.display_name)}
                      </label>
                      <select id={`role-${u.id}`} name="role" defaultValue={u.role} disabled={u.id === admin.id}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {a.roles[r]}
                          </option>
                        ))}
                      </select>
                      {u.id !== admin.id && (
                        <button className="btn ghost small" type="submit">
                          {a.c.save}
                        </button>
                      )}
                    </form>
                  </td>
                  <td className="small">{formatDateTime(u.last_login_at, "Europe/Oslo")}</td>
                  <td>
                    {u.id !== admin.id && (
                      <form action={anonymizeUser}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <button className="linkbtn small" type="submit">
                          {u$.anonymize}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">{u$.anonymizeNote}</p>
      </section>

      <div className="top">
        <section className="panel" aria-labelledby="inv-h">
          <h2 id="inv-h">{u$.invitesTitle}</h2>
          <InviteForm />
        </section>
        <section className="panel" aria-labelledby="invlist-h">
          <h2 id="invlist-h">{u$.invitedTitle(invites.length)}</h2>
          {invites.length === 0 ? (
            <p className="empty">{u$.noInvites}</p>
          ) : (
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 4, maxHeight: 360, overflowY: "auto" }}>
              {invites.map((i) => (
                <li key={i.email} className="row" style={{ justifyContent: "space-between" }}>
                  <span className="small">{i.email}</span>
                  <form action={removeInvite}>
                    <input type="hidden" name="email" value={i.email} />
                    <button className="linkbtn small" type="submit" aria-label={u$.removeLabel(i.email)}>
                      {u$.remove}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
