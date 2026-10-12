import "server-only";
import { db, type Db } from "./db";

export async function logAudit(
  entry: {
    userId: number | null;
    action: string;
    entity: string;
    entityId?: string | number | null;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  },
  runner: Db = db,
) {
  await runner.execute(
    "INSERT INTO audit_log (user_id, action, entity, entity_id, before_data, after_data, reason, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      entry.userId,
      entry.action,
      entry.entity,
      entry.entityId == null ? null : String(entry.entityId),
      entry.before === undefined ? null : JSON.stringify(entry.before),
      entry.after === undefined ? null : JSON.stringify(entry.after),
      entry.reason ? entry.reason.slice(0, 500) : null,
      new Date(),
    ],
  );
}
