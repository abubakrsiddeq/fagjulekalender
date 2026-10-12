# Fagjulekalender

A 24-door advent calendar of multiple-choice questions for home care staff, with points and a
department-vs-department leaderboard. Built from the requirements document
"Fagjulekalender Web App — Requirements" (BKR Tech Solutions, 10 Oct 2026).

- **App:** Next.js 16 (App Router, TypeScript), server-rendered, no client-side answer key
- **Database:** MySQL 8+ or MariaDB 10.4+ (Hostinger MySQL, managed in phpMyAdmin)
- **Sign-in:** e-mail + 6-digit one-time code (no passwords), sent over SMTP
- **UI language:** Norwegian Bokmål for participants (texts in `src/i18n/nb.ts`), Norwegian admin

---

## 1. Run it locally

Prerequisites: Node.js 20.9+ (22 or 24 recommended) and a local MySQL/MariaDB.

```bash
npm install

# Create an empty database, then load the schema and the 2026 seed data
mysql -u root -e "CREATE DATABASE fagjulekalender_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root fagjulekalender_dev < database/schema.sql
mysql -u root fagjulekalender_dev < database/seed.sql

cp .env.example .env.local   # then edit: DB_*, AUTH_SECRET, ADMIN_EMAILS; leave SMTP_HOST empty
npm run dev
```

Open http://localhost:3000, sign in with an address from `ADMIN_EMAILS`. Without SMTP the
sign-in code is printed in the terminal. You get the admin role automatically.

The seeded calendar starts 1 December, so no door is open yet. To try answering today:
**Admin → Kalendere → Fagjulekalender 2026 → Kopier til nytt år**, then edit the copy's start
date to a few days ago and publish it.

## 2. Deploy on Hostinger

### 2.1 Database (phpMyAdmin)

1. hPanel → **Databases → MySQL Databases**: create a database and a user (note the name,
   user, password and the MySQL host shown on that page).
2. Open **phpMyAdmin** for that database → **Import** → choose `database/schema.sql` → *Import*.
3. Import `database/seed.sql` the same way. It creates the organization, five example
   departments and the 2026 calendar with the 24 questions from the prototype (as a **draft**).

`schema.sql` starts with `DROP TABLE IF EXISTS`, so **never re-import it on a live database** —
it deletes all data. Later changes come as migrations in `database/migrations/`.

**Already imported the first `schema.sql`?** Run `database/migrations/001-registrering.sql` once:
phpMyAdmin → select the database → **SQL** tab → paste the file → *Go*. It adds the registration
fields and opens sign-up to every e-mail address.

### 2.2 The app (Node.js web app)

1. Push this repository to GitHub (recommended) or zip it **without** `node_modules`, `.next`
   and `.env.local`.
2. hPanel → **Websites → Add website → Node.js web app** → connect the GitHub repo or upload the zip.
3. Node.js version **22** or **24** (Node 20 is end-of-life). Framework: Next.js (auto-detected).
   Build command `npm run build`, start command `npm start`.
   `npm run build` runs `next build --webpack`: Hostinger's build servers have an old glibc, so
   Next.js's native compiler (and with it Turbopack) can't run there and Next falls back to its
   WebAssembly compiler. For the same reason the config is `next.config.mjs`, not `.ts`.
   Warnings about `@next/swc-linux-x64-gnu` / `GLIBC_2.29` in the build log are expected.
4. Add the environment variables from `.env.example` (you can upload a `.env` file there):

| Variable | Value |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | From hPanel → Databases. When the app and the database are on the same Hostinger account the host is usually `localhost`; otherwise use the MySQL hostname shown there. |
| `APP_URL` | `https://your-domain.no` (no trailing slash). Must be https in production so the session cookie is `Secure`. |
| `AUTH_SECRET` | 48+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_EMAILS` | Comma-separated addresses that become administrators on sign-in. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | A mailbox from Hostinger Email: `smtp.hostinger.com`, port `465`. |
| `CRON_SECRET` | Another long random string. |
| `ORG_ID` | `1` (the organization created by `seed.sql`). |

Do **not** set `MAIL_LOG_ONLY` in production.

> **E-mail volume.** Sign-in codes are low volume, but the daily reminder can go to every
> participant who opts in. Check your mailbox's daily sending limit with Hostinger. For
> 1,000+ recipients a transactional SMTP service with EU hosting is safer; only the `SMTP_*`
> values change.

### 2.3 Scheduled job (daily reminder + GDPR clean-up)

hPanel → **Advanced → Cron Jobs**, every 10 minutes:

```bash
curl -fsS "https://your-domain.no/api/cron?key=YOUR_CRON_SECRET" > /dev/null
```

Each run:
- sends "today's door is open" once per door to participants who opted in and haven't
  answered yet, from the calendar's configured time (e.g. 07:30) up to 4 hours after;
- deletes expired sign-in codes and sessions;
- anonymizes non-admin users 12 months after the last calendar they took part in closed.

### 2.4 Hosting the app elsewhere (e.g. Vercel) with the database on Hostinger

Possible via hPanel → **Databases → Remote MySQL** (add the app server's IP, or "Any host").
Note two trade-offs: "Any host" exposes the database port to the internet, and the in-memory
rate limiter and leaderboard cache are per instance on serverless platforms. A single
long-running Node process (Hostinger Node.js app or a VPS) is the intended setup.

## 3. Before 1 December (admin checklist)

The calendar overview page (**Admin → Kalendere → [calendar]**) shows this as a checklist.

1. **Innstillinger:** organization name, whether participants may propose departments,
   optional brand colour and logo. Sign-up is open to every e-mail address by default; add
   domains here (e.g. `oslo.kommune.no`) or use the invite list only if you want to restrict it.
2. **Avdelinger:** add, rename, merge duplicates, archive.
3. **Spørsmål:** check all 24 doors, or import a CSV (export first for the template;
   `database/sporsmal-2026.csv` is the seed questions in that format).
4. Record the subject-matter approval per question (**Godkjent av / Godkjent dato**).
5. **Forhåndsvisning:** read every door with its correct answer and explanation.
6. **Brukere og tilgang:** invite list if you don't use a domain rule; set department leads.
7. **Publiser**, then share the link shown on the overview page.

During December: **Deltakere** (move someone, reset an answer — both need a reason and are
logged), **Rapport og eksport** (participation per day per department, CSV exports).
After the last door: export results, then **Arkiver**.

## 4. How the requirements are covered

| Requirement | Where |
| --- | --- |
| FR-1.1 e-mail one-time code | `src/lib/login.ts`, `/logg-inn` |
| FR-1.3 allowed domains / invite list | Admin → Innstillinger, Brukere og tilgang |
| FR-1.4 editable display name | `/profil` |
| Registration on first sign-in: Kommune, Bydel (optional), Avdeling eller seksjon, Ressursnummer, Ansvarlig | `/registrering`, `src/lib/registration.ts`; editable under `/profil`; included in participant and lead exports |
| FR-2.1–2.4 departments, proposals, change lock after door 1 | `src/lib/departments.ts`, calendar page |
| FR-3.1–3.5 calendar, server-side unlock in Europe/Oslo, door states, preview | `src/lib/calendar.ts`, `src/lib/time.ts`, admin preview |
| FR-4.1 one attempt (unique key), FR-4.2 no answer key before answering | `src/lib/answers.ts`, `POST /api/kalender/[slug]/luker/[door]/svar` |
| FR-4.3 per-participant shuffle, FR-4.4 2–6 options + image URL | calendar setting, question editor |
| FR-5.1–5.3 points, same-day bonus, scored from stored answers | `src/lib/leaderboard.ts` |
| FR-6.1–6.5 average per participant, min answers, top 15 with «Kollega», ≤1 min updates, tie-break | `src/lib/leaderboard.ts`, `/kalender/[slug]/resultater` (refreshes every 30 s) |
| FR-7.1–7.2 own score, department rank and gap | calendar page |
| FR-8.1–8.6 create/copy/archive, editor, CSV import/export, edit lock + audit, exports, participation report | `/admin/...`, `src/lib/questions.ts`, `src/lib/admin.ts` |
| FR-9.1 daily e-mail | `src/lib/cron.ts`, `/api/cron` |
| Department lead view + export | `/kalender/[slug]/min-avdeling` |
| Source revision reminder | Admin → Spørsmål → Kilderutiner |

**Not built in v1:** FR-1.2 Entra ID SSO (Should; one of the open questions), FR-9.2 weekly
summary to leads (Could), `.xlsx` upload (import and export are CSV that Excel opens and
saves; the import page says how), image upload (questions take an image URL).

## 5. Data model

`users` also holds the registration fields (`kommune`, `bydel`, `ressursnummer`, `ansvarlig`,
`department_id` = "Avdeling eller seksjon", `registered_at`). "Avdeling eller seksjon" is the
department the participant competes for: they join each open calendar with it automatically
and can change it until door 1 opens. **GDPR:** the requirements say "store only name, work
e-mail, department and answers" — the data processing agreement must now also list kommune,
bydel, ressursnummer and ansvarlig. Anonymization (manual and after 12 months) clears them.

`database/schema.sql` has the nine tables from the requirements (`organizations`, `users`,
`departments`, `calendars`, `memberships`, `questions`, `question_options` — "Option" is a
reserved word —, `answers`, `audit_log`) plus four support tables: `invites`, `login_codes`,
`sessions` and `notification_log`. All `DATETIME`s are UTC; the app converts to the calendar's
time zone with `Intl`, so MySQL's time-zone tables are not needed. Scores are never stored:
they are computed from `answers`. Changing a question's correct option re-scores its stored
answers, and the change is logged.

To change the seed questions, edit `scripts/build-seed.mjs` and run `npm run seed:build`.

## 6. Verified before hand-over (local, MySQL 9.7)

- Phone journey at 360 px (sign in → pick department → answer today's door): works,
  ~5 s of automated time; no horizontal scrolling; light and dark theme.
- axe-core WCAG 2.1 AA scan: 0 violations on all participant and admin pages tested.
- API: door 6 answered a day early → 403; second answer → 409; option from another door → 400;
  cross-site POST → 403; unanswered doors contain no answer key in HTML or JSON.
- Load: 2,000 participants each loading the door page and answering, 50 at a time:
  all 2,000 accepted in 26 s; p95 562 ms (page) / 391 ms (answer); max 1.16 s.
- Department ranking recomputed by hand from the "Alle svar" CSV export: identical.
- Admin: CSV import of all 24 questions, guarded edit of an opened door, re-scoring, move
  participant, reset answer, merge departments, exports, audit log.
- Unlock times across both daylight-saving switches in Europe/Oslo.

Repeat the load test on the Hostinger plan itself before December; the numbers above are
from a laptop.

## 7. Notes for developers

- This is Next.js 16 with **Cache Components** and **Partial Prefetching** on. Every page
  reads the session through `getCurrentUser()` (`src/lib/auth.ts`), which calls
  `connection()` first, so current time and database reads never run during prerendering.
  Keep that order in new pages: session first, then data. See `node_modules/next/dist/docs/`.
- The calendar page shows the department picker inline instead of redirecting to it: the
  client router caches a server redirect and would replay it after the participant joined.
- The in-memory rate limiter (`src/lib/ratelimit.ts`) and leaderboard cache (15 s) assume one
  Node process. Sign-in limits are also enforced in the database.
- Without JavaScript, the sign-in form submits but doesn't advance to the code step. Every
  supported browser runs JavaScript, so this only matters for unusual setups.
