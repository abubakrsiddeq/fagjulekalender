import "server-only";
import { db } from "./db";
import { env } from "./env";
import { answerBlock, listCalendars, todayDoor } from "./calendar";
import { escapeHtml, sendMail } from "./mail";
import { localHm } from "./time";
import type { Calendar } from "./types";

// Called by a scheduled job (Hostinger hPanel → Cron Jobs), e.g. every 10 minutes:
//   curl -fsS "https://your-domain/api/cron?key=CRON_SECRET" > /dev/null

const SEND_WINDOW_HOURS = 4; // don't send a "today's door is open" mail late in the evening

export interface ReminderJob {
  calendar: Calendar;
  door: number;
  questionId: number;
}

/** FR-9.1: which calendars should send today's reminder now. Claims each door once. */
export async function claimDailyReminders(now: Date): Promise<ReminderJob[]> {
  const jobs: ReminderJob[] = [];
  for (const cal of await listCalendars(["published"])) {
    if (!cal.notify_time) continue;
    const door = todayDoor(cal, now);
    if (!door || answerBlock(cal, door, now)) continue;
    const local = localHm(now, cal.timezone);
    const [h, m] = cal.notify_time.split(":").map(Number);
    const windowEnd = `${String(Math.min(23, h + SEND_WINDOW_HOURS)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    if (local < cal.notify_time || local > windowEnd) continue;
    const q = await db.queryOne<{ id: number }>("SELECT id FROM questions WHERE calendar_id = ? AND door_number = ?", [cal.id, door]);
    if (!q) continue;
    // The primary key (calendar_id, door_number) makes sure only one run sends it.
    const claimed = await db.execute("INSERT IGNORE INTO notification_log (calendar_id, door_number, sent_at, recipients) VALUES (?, ?, ?, 0)", [cal.id, door, now]);
    if (claimed.affectedRows === 1) jobs.push({ calendar: cal, door, questionId: q.id });
  }
  return jobs;
}

export async function sendReminders(job: ReminderJob): Promise<number> {
  const { calendar: cal, door, questionId } = job;
  const recipients = await db.query<{ email: string; display_name: string }>(
    `SELECT u.email, u.display_name FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.calendar_id = ? AND u.notify_daily = 1 AND u.anonymized_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.question_id = ? AND a.user_id = u.id)`,
    [cal.id, questionId],
  );
  const link = `${env.appUrl}/kalender/${cal.slug}/luke/${door}`;
  const profile = `${env.appUrl}/profil`;
  let sent = 0;
  for (const r of recipients) {
    try {
      await sendMail({
        to: r.email,
        subject: `Luke ${door} er åpen – ${cal.name}`,
        text: `Hei ${r.display_name}!\n\nDagens luke i ${cal.name} er åpen. Det tar under ett minutt:\n${link}\n\nVil du ikke ha disse e-postene? Skru dem av her: ${profile}`,
        html: `<p>Hei ${escapeHtml(r.display_name)}!</p><p>Dagens luke i ${escapeHtml(cal.name)} er åpen. Det tar under ett minutt.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;background:#1e4a38;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Åpne luke ${door}</a></p><p style="font-size:13px;color:#56655d">Vil du ikke ha disse e-postene? <a href="${escapeHtml(profile)}">Skru dem av i profilen din</a>.</p>`,
      });
      sent++;
    } catch (err) {
      console.error(`Reminder to ${r.email} failed`, err);
    }
  }
  await db.execute("UPDATE notification_log SET recipients = ? WHERE calendar_id = ? AND door_number = ?", [sent, cal.id, door]);
  return sent;
}

/** GDPR clean-up: expired sign-in data, and anonymize participants 12 months after their last calendar closed. */
export async function cleanup(now: Date) {
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000);
  const codes = await db.execute("DELETE FROM login_codes WHERE created_at < ?", [dayAgo]);
  const sessions = await db.execute("DELETE FROM sessions WHERE expires_at < ?", [now]);
  const anonymized = await db.execute(
    `UPDATE users u
        SET u.email = CONCAT('anonymisert-', u.id, '@anonymisert.invalid'), u.display_name = 'Anonymisert',
            u.hide_name = 1, u.notify_daily = 0, u.anonymized_at = ?
      WHERE u.org_id = ? AND u.role <> 'admin' AND u.anonymized_at IS NULL AND u.created_at < ?
        AND NOT EXISTS (SELECT 1 FROM memberships m JOIN calendars c ON c.id = m.calendar_id
                         WHERE m.user_id = u.id AND c.closes_at >= ?)`,
    [now, env.orgId, yearAgo, yearAgo],
  );
  if (anonymized.affectedRows) {
    await db.execute("DELETE s FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.anonymized_at IS NOT NULL");
    await db.execute("INSERT INTO audit_log (user_id, action, entity, after_data, at) VALUES (NULL, 'user.auto_anonymize', 'user', ?, ?)", [
      JSON.stringify({ count: anonymized.affectedRows }),
      now,
    ]);
  }
  return { loginCodes: codes.affectedRows, sessions: sessions.affectedRows, anonymizedUsers: anonymized.affectedRows };
}
