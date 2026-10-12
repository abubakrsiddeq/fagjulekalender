import { apiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { answersForExport, localTimeLabel, requireCalendar } from "@/lib/admin";
import { pointsFor } from "@/lib/calendar";
import { csvResponse, nbNumber, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { getScoreboard } from "@/lib/leaderboard";
import { listQuestions, questionsToCsv } from "@/lib/questions";
import { LETTERS } from "@/lib/answers";

/** FR-8.5 / FR-8.3: admin CSV exports. type = avdelinger | deltakere | svar | sporsmal */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/kalendere/[id]/eksport/[type]">) {
  const user = await getCurrentUser();
  if (!user) return apiError(401);
  if (user.role !== "admin") return apiError(403);
  const { id, type } = await ctx.params;
  const cal = await requireCalendar(id);
  if (!cal) return apiError(404);
  const stamp = new Date().toISOString().slice(0, 10);

  switch (type) {
    case "sporsmal":
      return csvResponse(`sporsmal-${cal.slug}-${stamp}.csv`, questionsToCsv(await listQuestions(cal.id)));

    case "avdelinger": {
      const board = await getScoreboard(cal, { fresh: true });
      const rows = board.departments.map((d) => [d.rank, d.name, d.participants, d.members, d.totalPoints, nbNumber(d.average, 2)]);
      return csvResponse(
        `resultat-avdelinger-${cal.slug}-${stamp}.csv`,
        toCsv([["plass", "avdeling", "deltakere_som_teller", "medlemmer", "totalpoeng", "snitt"], ...rows], { guardFormulas: true }),
      );
    }

    case "deltakere": {
      const board = await getScoreboard(cal, { fresh: true });
      const rows = [...board.participants]
        .sort((a, b) => a.departmentName.localeCompare(b.departmentName, "nb") || b.points - a.points)
        .map((p) => [
          p.displayName,
          p.email,
          p.kommune,
          p.bydel,
          p.ressursnummer,
          p.ansvarlig,
          p.departmentName,
          p.departmentStatus,
          p.answered,
          p.correct,
          p.points,
          p.counted ? "ja" : "nei",
          p.lastCorrectAt ? localTimeLabel(p.lastCorrectAt, cal) : "",
        ]);
      return csvResponse(
        `resultat-deltakere-${cal.slug}-${stamp}.csv`,
        toCsv([["navn", "epost", "kommune", "bydel", "ressursnummer", "ansvarlig", "avdeling", "avdelingsstatus", "besvart", "riktige", "poeng", "teller_i_snitt", "sist_riktige_svar"], ...rows], {
          guardFormulas: true,
        }),
      );
    }

    case "svar": {
      const answers = await answersForExport(cal);
      const options = await db.query<{ id: number; question_id: number; sort_order: number }>(
        "SELECT o.id, o.question_id, o.sort_order FROM question_options o JOIN questions q ON q.id = o.question_id WHERE q.calendar_id = ? ORDER BY o.question_id, o.sort_order, o.id",
        [cal.id],
      );
      const letterOf = new Map<number, string>();
      let current = -1;
      let index = 0;
      for (const o of options) {
        if (o.question_id !== current) {
          current = o.question_id;
          index = 0;
        }
        letterOf.set(o.id, LETTERS[index++]);
      }
      const rows = answers.map((a) => [
        a.door_number,
        a.display_name,
        a.email,
        a.ressursnummer ?? "",
        a.department ?? "",
        letterOf.get(a.option_id) ?? "",
        a.is_correct ? "ja" : "nei",
        a.on_door_day ? "ja" : "nei",
        pointsFor(cal, !!a.is_correct, !!a.on_door_day),
        localTimeLabel(a.answered_at, cal),
      ]);
      return csvResponse(
        `svar-${cal.slug}-${stamp}.csv`,
        toCsv([["luke", "navn", "epost", "ressursnummer", "avdeling", "svar", "riktig", "samme_dag", "poeng", "tidspunkt"], ...rows], { guardFormulas: true }),
      );
    }

    default:
      return apiError(404);
  }
}
