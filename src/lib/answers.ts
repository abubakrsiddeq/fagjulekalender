import "server-only";
import { db, isDuplicateKey, transaction } from "./db";
import { answerBlock, doorDate, getMembership, pointsFor } from "./calendar";
import { seededShuffle } from "./shuffle";
import { localYmd } from "./time";
import type { Calendar } from "./types";

export const LETTERS = "ABCDEF";

/** What a participant may see before answering. Never contains the answer key (FR-4.2). */
export interface PublicQuestion {
  id: number;
  door: number;
  date: string;
  topic: string;
  text: string;
  imageUrl: string | null;
  options: { id: number; text: string; letter: string }[];
}

export interface AnswerResult {
  optionId: number;
  isCorrect: boolean;
  correctOptionId: number;
  points: number;
  explanation: string;
  sourceTitle: string | null;
  sourceEqsId: string | null;
  answeredAt: string;
}

export async function getPublicQuestion(cal: Calendar, door: number, userId: number): Promise<PublicQuestion | null> {
  const q = await db.queryOne<{ id: number; topic: string; text: string; image_url: string | null }>(
    "SELECT id, topic, text, image_url FROM questions WHERE calendar_id = ? AND door_number = ?",
    [cal.id, door],
  );
  if (!q) return null;
  // Deliberately does not select is_correct.
  let options = await db.query<{ id: number; text: string }>(
    "SELECT id, text FROM question_options WHERE question_id = ? ORDER BY sort_order, id",
    [q.id],
  );
  if (cal.shuffle_options) options = seededShuffle(options, `${userId}:${q.id}`);
  return {
    id: q.id,
    door,
    date: doorDate(cal, door),
    topic: q.topic,
    text: q.text,
    imageUrl: q.image_url,
    options: options.map((o, i) => ({ id: o.id, text: o.text, letter: LETTERS[i] })),
  };
}

/** The participant's stored answer with the correct option and explanation, or null if not answered. */
export async function getAnswerResult(cal: Calendar, questionId: number, userId: number): Promise<AnswerResult | null> {
  const row = await db.queryOne<{
    option_id: number;
    is_correct: number;
    on_door_day: number;
    answered_at: Date;
    explanation: string;
    source_title: string | null;
    source_eqs_id: string | null;
    correct_option_id: number;
  }>(
    `SELECT a.option_id, a.is_correct, a.on_door_day, a.answered_at,
            q.explanation, q.source_title, q.source_eqs_id,
            (SELECT o.id FROM question_options o WHERE o.question_id = q.id AND o.is_correct = 1 LIMIT 1) AS correct_option_id
       FROM answers a JOIN questions q ON q.id = a.question_id
      WHERE a.question_id = ? AND a.user_id = ?`,
    [questionId, userId],
  );
  if (!row) return null;
  return {
    optionId: row.option_id,
    isCorrect: !!row.is_correct,
    correctOptionId: row.correct_option_id,
    points: pointsFor(cal, !!row.is_correct, !!row.on_door_day),
    explanation: row.explanation,
    sourceTitle: row.source_title,
    sourceEqsId: row.source_eqs_id,
    answeredAt: row.answered_at.toISOString(),
  };
}

export type SubmitError =
  | "not_published"
  | "no_such_door"
  | "not_open"
  | "closed"
  | "no_department"
  | "no_question"
  | "invalid_option"
  | "already_answered";

export const SUBMIT_ERROR_STATUS: Record<SubmitError, number> = {
  not_published: 403,
  no_such_door: 404,
  not_open: 403,
  closed: 403,
  no_department: 403,
  no_question: 404,
  invalid_option: 400,
  already_answered: 409,
};

/**
 * The server check from the participant flow: door open, first attempt, valid option.
 * One attempt per door is enforced by the unique key (question_id, user_id).
 */
export async function submitAnswer(
  cal: Calendar,
  door: number,
  userId: number,
  optionId: number,
  now = new Date(),
): Promise<{ ok: true; result: AnswerResult } | { ok: false; error: SubmitError }> {
  const block = answerBlock(cal, door, now);
  if (block) return { ok: false, error: block };

  const membership = await getMembership(cal.id, userId);
  if (!membership) return { ok: false, error: "no_department" };

  const q = await db.queryOne<{ id: number }>("SELECT id FROM questions WHERE calendar_id = ? AND door_number = ?", [cal.id, door]);
  if (!q) return { ok: false, error: "no_question" };

  const outcome = await transaction(async (tx) => {
    const option = await tx.queryOne<{ id: number; is_correct: number }>(
      "SELECT id, is_correct FROM question_options WHERE id = ? AND question_id = ?",
      [optionId, q.id],
    );
    if (!option) return "invalid_option" as const;
    const onDoorDay = localYmd(now, cal.timezone) === doorDate(cal, door);
    try {
      await tx.execute(
        "INSERT INTO answers (calendar_id, question_id, user_id, option_id, is_correct, on_door_day, answered_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [cal.id, q.id, userId, option.id, option.is_correct, onDoorDay ? 1 : 0, now],
      );
    } catch (err) {
      if (isDuplicateKey(err)) return "already_answered" as const;
      throw err;
    }
    return null;
  });
  if (outcome) return { ok: false, error: outcome };

  const result = await getAnswerResult(cal, q.id, userId);
  return { ok: true, result: result! };
}
