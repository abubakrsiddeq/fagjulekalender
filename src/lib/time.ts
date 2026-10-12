// Time zone helpers built on Intl, so unlock times follow the calendar's zone
// (Europe/Oslo), summer time included, wherever the server runs.

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

export function zonedParts(date: Date, timeZone: string) {
  const p: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getUTCMilliseconds());
}

/** The UTC instant of local wall-clock time `ymd hh:mm` in `timeZone`. */
export function zonedTimeToUtc(ymd: string, hm: string, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm || 0);
  const first = offsetMs(new Date(guess), timeZone);
  let result = guess - first;
  const second = offsetMs(new Date(result), timeZone);
  if (second !== first) result = guess - second;
  return new Date(result);
}

/** Local calendar date 'YYYY-MM-DD' of `date` in `timeZone`. */
export function localYmd(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Local wall-clock 'HH:MM' of `date` in `timeZone`. */
export function localHm(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** 'YYYY-MM-DDTHH:MM' for <input type="datetime-local">. */
export function toLocalInput(date: Date, timeZone: string): string {
  return `${localYmd(date, timeZone)}T${localHm(date, timeZone)}`;
}

export function fromLocalInput(value: string, timeZone: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (!m) return null;
  return zonedTimeToUtc(m[1], m[2], timeZone);
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const MONTHS_NB = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

/** "1. desember" */
export function formatDayMonth(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d}. ${MONTHS_NB[m - 1]}`;
}

/** "1. des" */
export function formatDayMonthShort(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d}. ${MONTHS_NB[m - 1].slice(0, 3)}`;
}

/** "12.12.2026 07:31" in the given zone. */
export function formatDateTime(date: Date | null | undefined, timeZone: string): string {
  if (!date) return "–";
  const [y, m, d] = localYmd(date, timeZone).split("-");
  return `${d}.${m}.${y} ${localHm(date, timeZone)}`;
}

export function formatDate(ymd: string | null | undefined): string {
  if (!ymd) return "–";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}
