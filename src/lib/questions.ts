import "server-only";
import { db, isDuplicateKey, isForeignKeyViolation, transaction, type Db } from "./db";
import { doorOpensAt } from "./calendar";
import { logAudit } from "./audit";
import { invalidateScoreboard } from "./leaderboard";
import { parseCsv, toCsv } from "./csv";
import { LETTERS } from "./answers";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n";
import type { Calendar, Question, QuestionOption, QuestionWithOptions } from "./types";

const Q_COLS =
  "id, calendar_id, door_number, topic, text, image_url, explanation, source_title, source_eqs_id, source_revision_date, approved_by, approved_at, updated_at";

export async function listQuestions(calendarId: number): Promise<QuestionWithOptions[]> {
  const questions = await db.query<Question>(`SELECT ${Q_COLS} FROM questions WHERE calendar_id = ? ORDER BY door_number`, [calendarId]);
  if (!questions.length) return [];
  const options = await db.query<QuestionOption>(
    "SELECT id, question_id, text, is_correct, sort_order FROM question_options WHERE question_id IN (?) ORDER BY sort_order, id",
    [questions.map((q) => q.id)],
  );
  return questions.map((q) => ({ ...q, options: options.filter((o) => o.question_id === q.id) }));
}

export async function getQuestion(calendarId: number, door: number): Promise<QuestionWithOptions | null> {
  const q = await db.queryOne<Question>(`SELECT ${Q_COLS} FROM questions WHERE calendar_id = ? AND door_number = ?`, [calendarId, door]);
  if (!q) return null;
  const options = await db.query<QuestionOption>(
    "SELECT id, question_id, text, is_correct, sort_order FROM question_options WHERE question_id = ? ORDER BY sort_order, id",
    [q.id],
  );
  return { ...q, options };
}

export async function answerCounts(calendarId: number): Promise<Map<number, number>> {
  const rows = await db.query<{ question_id: number; n: number }>(
    "SELECT question_id, COUNT(*) AS n FROM answers WHERE calendar_id = ? GROUP BY question_id",
    [calendarId],
  );
  return new Map(rows.map((r) => [r.question_id, Number(r.n)]));
}

export interface QuestionInput {
  door: number;
  topic: string;
  text: string;
  imageUrl: string | null;
  explanation: string;
  sourceTitle: string | null;
  sourceEqsId: string | null;
  sourceRevisionDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  options: { id: number | null; text: string; isCorrect: boolean }[];
}

export function validateQuestion(input: QuestionInput, cal: Calendar, t: Dictionary): string[] {
  const v = t.admin.validation;
  const errors: string[] = [];
  if (!Number.isInteger(input.door) || input.door < 1 || input.door > cal.door_count) errors.push(v.doorRange(cal.door_count));
  if (!input.topic.trim()) errors.push(v.topicMissing);
  if (input.topic.length > 60) errors.push(v.topicTooLong);
  if (!input.text.trim()) errors.push(v.textMissing);
  if (!input.explanation.trim()) errors.push(v.explanationMissing);
  const opts = input.options.filter((o) => o.text.trim());
  if (opts.length < 2 || opts.length > 6) errors.push(v.optionCount);
  if (opts.some((o) => o.text.length > 500)) errors.push(v.optionTooLong);
  const correct = opts.filter((o) => o.isCorrect).length;
  if (correct !== 1) errors.push(v.exactlyOneCorrect);
  if (input.imageUrl && !/^https?:\/\/\S+$/i.test(input.imageUrl)) errors.push(v.imageUrl);
  for (const [label, value] of [[v.revisionDate, input.sourceRevisionDate], [v.approvedAt, input.approvedAt]] as const) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(v.invalidDate(label));
  }
  return errors;
}

/** FR-8.4: once a door is open (or has answers), edits need explicit confirmation. */
export function isDoorLocked(cal: Calendar, door: number, hasAnswers: boolean, now = new Date()): boolean {
  return hasAnswers || (cal.status === "published" && now >= doorOpensAt(cal, door));
}

export type SaveResult = { ok: true; door: number } | { ok: false; errors: string[]; needsConfirm?: boolean };

export async function saveQuestion(
  cal: Calendar,
  input: QuestionInput,
  existingDoor: number | null,
  actorId: number,
  confirm: { confirmed: boolean; reason: string },
): Promise<SaveResult> {
  const t = await getT();
  const v = t.admin.validation;
  const errors = validateQuestion(input, cal, t);
  if (errors.length) return { ok: false, errors };

  const existing = existingDoor != null ? await getQuestion(cal.id, existingDoor) : null;
  if (existingDoor != null && !existing) return { ok: false, errors: [v.questionGone] };
  const answers = existing ? (await answerCounts(cal.id)).get(existing.id) ?? 0 : 0;

  if (existing && existing.door_number !== input.door && answers > 0) {
    return { ok: false, errors: [v.cannotMoveAnswered] };
  }
  const locked = (existing && isDoorLocked(cal, existing.door_number, answers > 0)) || isDoorLocked(cal, input.door, false);
  if (locked && (!confirm.confirmed || !confirm.reason.trim())) {
    return {
      ok: false,
      needsConfirm: true,
      errors: [v.confirmOpened],
    };
  }

  const opts = input.options.filter((o) => o.text.trim());
  try {
    await transaction(async (tx) => {
      let questionId: number;
      const fields = [
        input.door,
        input.topic.trim(),
        input.text.trim(),
        input.imageUrl || null,
        input.explanation.trim(),
        input.sourceTitle || null,
        input.sourceEqsId || null,
        input.sourceRevisionDate || null,
        input.approvedBy || null,
        input.approvedAt || null,
      ];
      if (existing) {
        questionId = existing.id;
        await tx.execute(
          `UPDATE questions SET door_number = ?, topic = ?, text = ?, image_url = ?, explanation = ?, source_title = ?,
             source_eqs_id = ?, source_revision_date = ?, approved_by = ?, approved_at = ? WHERE id = ?`,
          [...fields, questionId],
        );
      } else {
        const res = await tx.execute(
          `INSERT INTO questions (calendar_id, door_number, topic, text, image_url, explanation, source_title,
             source_eqs_id, source_revision_date, approved_by, approved_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cal.id, ...fields, new Date()],
        );
        questionId = res.insertId;
      }

      const keepIds = new Set(opts.map((o) => o.id).filter((id): id is number => id != null));
      const existingIds = new Set(existing?.options.map((o) => o.id) ?? []);
      for (const id of existingIds) {
        if (!keepIds.has(id)) await tx.execute("DELETE FROM question_options WHERE id = ? AND question_id = ?", [id, questionId]);
      }
      for (const [i, o] of opts.entries()) {
        if (o.id != null && existingIds.has(o.id)) {
          await tx.execute("UPDATE question_options SET text = ?, is_correct = ?, sort_order = ? WHERE id = ? AND question_id = ?", [
            o.text.trim(),
            o.isCorrect ? 1 : 0,
            i,
            o.id,
            questionId,
          ]);
        } else {
          await tx.execute("INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES (?, ?, ?, ?)", [
            questionId,
            o.text.trim(),
            o.isCorrect ? 1 : 0,
            i,
          ]);
        }
      }

      // If the correct option changed, re-score stored answers from the options.
      await tx.execute(
        "UPDATE answers a JOIN question_options o ON o.id = a.option_id SET a.is_correct = o.is_correct WHERE a.question_id = ?",
        [questionId],
      );

      await logAudit(
        {
          userId: actorId,
          action: existing ? "question.update" : "question.create",
          entity: "question",
          entityId: questionId,
          before: existing ? snapshot(existing) : undefined,
          after: { ...input, options: opts },
          reason: confirm.reason.trim() || null,
        },
        tx,
      );
    });
  } catch (err) {
    if (isDuplicateKey(err)) return { ok: false, errors: [v.doorTaken(input.door)] };
    if (isForeignKeyViolation(err)) return { ok: false, errors: [v.optionInUse] };
    throw err;
  }
  invalidateScoreboard(cal.id);
  return { ok: true, door: input.door };
}

export async function deleteQuestion(cal: Calendar, door: number, actorId: number): Promise<string | null> {
  const q = await getQuestion(cal.id, door);
  if (!q) return null;
  const n = (await answerCounts(cal.id)).get(q.id) ?? 0;
  if (n > 0) return (await getT()).admin.validation.hasAnswers;
  await transaction(async (tx) => {
    await tx.execute("DELETE FROM questions WHERE id = ?", [q.id]);
    await logAudit({ userId: actorId, action: "question.delete", entity: "question", entityId: q.id, before: snapshot(q) }, tx);
  });
  return null;
}

function snapshot(q: QuestionWithOptions) {
  return {
    door: q.door_number,
    topic: q.topic,
    text: q.text,
    imageUrl: q.image_url,
    explanation: q.explanation,
    sourceTitle: q.source_title,
    sourceEqsId: q.source_eqs_id,
    sourceRevisionDate: q.source_revision_date,
    approvedBy: q.approved_by,
    approvedAt: q.approved_at,
    options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: !!o.is_correct })),
  };
}

// ---------------------------------------------------------------------------
// CSV import / export (FR-8.3)
// ---------------------------------------------------------------------------

export const CSV_HEADER = [
  "door",
  "topic",
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "option_f",
  "correct",
  "explanation",
  "source_title",
  "source_eqs_id",
  "source_revision_date",
  "image_url",
  "approved_by",
  "approved_at",
] as const;

type Field = (typeof CSV_HEADER)[number];

const ALIASES: Record<string, Field> = {
  luke: "door",
  door_number: "door",
  tema: "topic",
  emne: "topic",
  text: "question",
  sporsmal: "question",
  spørsmål: "question",
  riktig: "correct",
  fasit: "correct",
  riktig_svar: "correct",
  forklaring: "explanation",
  kilde: "source_title",
  source: "source_title",
  eqs: "source_eqs_id",
  eqs_id: "source_eqs_id",
  revisjonsdato: "source_revision_date",
  bilde: "image_url",
  bilde_url: "image_url",
  godkjent_av: "approved_by",
  godkjent_dato: "approved_at",
};
for (const l of "abcdef") {
  ALIASES[l] = `option_${l}` as Field;
  ALIASES[`alternativ_${l}`] = `option_${l}` as Field;
  ALIASES[`svar_${l}`] = `option_${l}` as Field;
}

function normalizeHeader(h: string): Field | null {
  const key = h.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((CSV_HEADER as readonly string[]).includes(key)) return key as Field;
  return ALIASES[key] ?? null;
}

function parseDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "invalid";
}

export interface ImportReport {
  imported: number[];
  skipped: { door: number | string; reason: string }[];
  errors: string[];
}

export async function importQuestionsCsv(cal: Calendar, text: string, actorId: number, overwriteOpened: boolean): Promise<ImportReport> {
  const t = await getT();
  const v = t.admin.validation;
  const report: ImportReport = { imported: [], skipped: [], errors: [] };
  const rows = parseCsv(text);
  if (rows.length < 2) {
    report.errors.push(v.emptyFile);
    return report;
  }
  const header = rows[0].map(normalizeHeader);
  for (const required of ["door", "topic", "question", "option_a", "option_b", "correct", "explanation"] as const) {
    if (!header.includes(required)) report.errors.push(v.missingColumn(required));
  }
  if (report.errors.length) return report;

  const existing = await listQuestions(cal.id);
  const counts = await answerCounts(cal.id);
  const byDoor = new Map(existing.map((q) => [q.door_number, q]));
  const seen = new Set<number>();

  for (const [index, row] of rows.slice(1).entries()) {
    const lineNo = index + 2;
    const get = (f: Field) => {
      const i = header.indexOf(f);
      return i >= 0 ? (row[i] ?? "").trim() : "";
    };
    const door = Number(get("door"));
    const label = Number.isInteger(door) && door > 0 ? door : v.rowLabel(lineNo);
    if (seen.has(door)) {
      report.skipped.push({ door: label, reason: v.duplicateDoor });
      continue;
    }
    seen.add(door);

    const optionTexts = "abcdef".split("").map((l) => get(`option_${l}` as Field));
    const correctRaw = get("correct").toUpperCase();
    const correctIndex = /^[1-6]$/.test(correctRaw) ? Number(correctRaw) - 1 : LETTERS.indexOf(correctRaw);
    const revision = parseDate(get("source_revision_date"));
    const approvedAt = parseDate(get("approved_at"));
    const options = optionTexts
      .map((t, i) => ({ id: null, text: t, isCorrect: i === correctIndex }))
      .filter((o) => o.text);
    if (correctIndex >= 0 && !optionTexts[correctIndex]) {
      report.skipped.push({ door: label, reason: v.emptyCorrect(correctRaw) });
      continue;
    }
    const input: QuestionInput = {
      door,
      topic: get("topic"),
      text: get("question"),
      imageUrl: get("image_url") || null,
      explanation: get("explanation"),
      sourceTitle: get("source_title") || null,
      sourceEqsId: get("source_eqs_id") || null,
      sourceRevisionDate: revision === "invalid" ? "x" : revision,
      approvedBy: get("approved_by") || null,
      approvedAt: approvedAt === "invalid" ? "x" : approvedAt,
      options,
    };
    const errors = validateQuestion(input, cal, t);
    if (errors.length) {
      report.skipped.push({ door: label, reason: errors.join(" ") });
      continue;
    }

    const current = byDoor.get(door);
    if (current) {
      if ((counts.get(current.id) ?? 0) > 0) {
        report.skipped.push({ door, reason: v.doorHasAnswers });
        continue;
      }
      if (isDoorLocked(cal, door, false) && !overwriteOpened) {
        report.skipped.push({ door, reason: v.doorOpened });
        continue;
      }
    }

    await transaction(async (tx: Db) => {
      let qid: number;
      const values = [
        input.topic,
        input.text,
        input.imageUrl,
        input.explanation,
        input.sourceTitle,
        input.sourceEqsId,
        input.sourceRevisionDate,
        input.approvedBy,
        input.approvedAt,
      ];
      if (current) {
        qid = current.id;
        await tx.execute(
          `UPDATE questions SET topic = ?, text = ?, image_url = ?, explanation = ?, source_title = ?, source_eqs_id = ?,
             source_revision_date = ?, approved_by = ?, approved_at = ? WHERE id = ?`,
          [...values, qid],
        );
        await tx.execute("DELETE FROM question_options WHERE question_id = ?", [qid]);
      } else {
        const res = await tx.execute(
          `INSERT INTO questions (calendar_id, door_number, topic, text, image_url, explanation, source_title, source_eqs_id,
             source_revision_date, approved_by, approved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cal.id, door, ...values, new Date()],
        );
        qid = res.insertId;
      }
      for (const [i, o] of options.entries()) {
        await tx.execute("INSERT INTO question_options (question_id, text, is_correct, sort_order) VALUES (?, ?, ?, ?)", [qid, o.text, o.isCorrect ? 1 : 0, i]);
      }
      await logAudit(
        { userId: actorId, action: "question.import", entity: "question", entityId: qid, before: current ? snapshot(current) : undefined, after: input },
        tx,
      );
    });
    report.imported.push(door);
  }
  invalidateScoreboard(cal.id);
  return report;
}

export function questionsToCsv(questions: QuestionWithOptions[]): string {
  const rows: (string | number | null)[][] = [[...CSV_HEADER]];
  for (const q of questions) {
    const opts = [...q.options.map((o) => o.text), "", "", "", "", "", ""].slice(0, 6);
    const correct = q.options.findIndex((o) => o.is_correct);
    rows.push([
      q.door_number,
      q.topic,
      q.text,
      ...opts,
      correct >= 0 ? LETTERS[correct] : "",
      q.explanation,
      q.source_title,
      q.source_eqs_id,
      q.source_revision_date,
      q.image_url,
      q.approved_by,
      q.approved_at,
    ]);
  }
  return toCsv(rows);
}
