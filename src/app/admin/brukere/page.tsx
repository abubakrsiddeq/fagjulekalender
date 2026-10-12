import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { allowedDomains, getOrg } from "@/lib/org";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { anonymizeUser, removeInvite, setUserRole } from "../actions";
import { InviteForm } from "../_components/InviteForm";

export const metadata = { title: "Brukere og tilgang" };

export default function UsersPage(props: PageProps<"/admin/brukere">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

const ROLES = [
  { value: "participant", label: "Deltaker" },
  { value: "lead", label: "Avdelingsleder" },
  { value: "admin", label: "Administrator" },
];

async function Content({ searchParams }: { searchParams: PageProps<"/admin/brukere">["searchParams"] }) {
  const admin = await requireAdmin("/admin/brukere");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const users = await db.query<{
    id: number;
    email: string;
    display_name: string;
    role: string;
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
      <h1>Brukere og tilgang</h1>

      <section className="panel" aria-labelledby="rule-h">
        <h2 id="rule-h">Hvem kan logge inn?</h2>
        <p>
          {domains.length ? (
            <>
              Alle med e-post på <b>{domains.map((d) => "@" + d).join(", ")}</b>
              {invites.length ? `, og ${invites.length} inviterte adresser` : ""}.
            </>
          ) : invites.length ? (
            <>Bare de {invites.length} adressene på invitasjonslisten.</>
          ) : (
            <>Alle (ingen domene- eller invitasjonsregel er satt).</>
          )}{" "}
          Eksisterende brukere og ADMIN_EMAILS kan alltid logge inn. Domener endres under <Link href="/admin/innstillinger">Innstillinger</Link>.
        </p>
      </section>

      <section className="panel" aria-labelledby="users-h">
        <div className="panel-head">
          <h2 id="users-h">Brukere</h2>
          <form className="inline-form" role="search">
            <label htmlFor="q" className="sr-only">
              Søk etter navn, e-post eller ressursnummer
            </label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Søk navn, e-post, ressursnr." />
            <button className="btn ghost small" type="submit">
              Søk
            </button>
          </form>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th scope="col">Navn</th>
                <th scope="col">E-post</th>
                <th scope="col">Kommune / bydel</th>
                <th scope="col">Ressursnr.</th>
                <th scope="col">Rolle</th>
                <th scope="col">Sist innlogget</th>
                <th scope="col">
                  <span className="sr-only">Personvern</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.display_name}</td>
                  <td className="small">{u.email}</td>
                  <td className="small">{u.registered_at ? [u.kommune, u.bydel].filter(Boolean).join(" / ") : <span className="badge warn">Ikke registrert</span>}</td>
                  <td className="small">{u.ressursnummer ?? "–"}</td>
                  <td>
                    <form action={setUserRole} className="inline-form">
                      <input type="hidden" name="user_id" value={u.id} />
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        Rolle for {u.display_name}
                      </label>
                      <select id={`role-${u.id}`} name="role" defaultValue={u.role} disabled={u.id === admin.id}>
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      {u.id !== admin.id && (
                        <button className="btn ghost small" type="submit">
                          Lagre
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
                          Anonymiser
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">Anonymisering fjerner navn og e-post, men beholder svarene i statistikken. Den kan ikke angres.</p>
      </section>

      <div className="top">
        <section className="panel" aria-labelledby="inv-h">
          <h2 id="inv-h">Invitasjonsliste</h2>
          <InviteForm />
        </section>
        <section className="panel" aria-labelledby="invlist-h">
          <h2 id="invlist-h">Inviterte ({invites.length})</h2>
          {invites.length === 0 ? (
            <p className="empty">Ingen inviterte.</p>
          ) : (
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 4, maxHeight: 360, overflowY: "auto" }}>
              {invites.map((i) => (
                <li key={i.email} className="row" style={{ justifyContent: "space-between" }}>
                  <span className="small">{i.email}</span>
                  <form action={removeInvite}>
                    <input type="hidden" name="email" value={i.email} />
                    <button className="linkbtn small" type="submit" aria-label={`Fjern ${i.email}`}>
                      Fjern
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
