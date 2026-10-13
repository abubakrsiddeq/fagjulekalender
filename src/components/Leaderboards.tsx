import type { DepartmentScore, TopEntry } from "@/lib/leaderboard";
import { ScrollTable } from "./ScrollTable";
import { getT } from "@/i18n/server";

export async function DepartmentTable({ departments, mine }: { departments: DepartmentScore[]; mine?: number | null }) {
  const t = await getT();
  const fmt = (n: number) => n.toLocaleString(t.intl, { maximumFractionDigits: 1 });
  if (!departments.length) return <p className="empty">{t.results.empty}</p>;
  return (
    <ScrollTable label={t.results.title}>
      <table>
        <caption className="sr-only">
          {t.results.title}. {t.results.subtitle}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t.results.rank}</th>
            <th scope="col">{t.results.department}</th>
            <th scope="col" className="num">
              {t.results.participants}
            </th>
            <th scope="col" className="num">
              {t.results.total}
            </th>
            <th scope="col" className="num">
              {t.results.average}
            </th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.departmentId} className={d.departmentId === mine ? "mine" : undefined}>
              <td className="rank">{d.rank}</td>
              <td>
                {d.name}
                {d.departmentId === mine && <span className="small"> ({t.results.yourDepartment})</span>}
              </td>
              <td className="num">{d.participants}</td>
              <td className="num">{d.totalPoints}</td>
              <td className="num">
                <b>{fmt(d.average)}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

export async function TopTable({ entries, me }: { entries: TopEntry[]; me: number }) {
  const t = await getT();
  if (!entries.length) return <p className="empty">{t.results.empty}</p>;
  return (
    <ScrollTable label={t.results.topTitle}>
      <table>
        <caption className="sr-only">{t.results.topTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{t.results.rank}</th>
            <th scope="col">{t.results.name}</th>
            <th scope="col">{t.results.department}</th>
            <th scope="col" className="num">
              {t.results.pointsCol}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.userId} className={e.userId === me ? "mine" : undefined}>
              <td className="rank">{e.rank}</td>
              <td>{e.userId === me ? `${e.name} (${t.results.you})` : e.name}</td>
              <td>{e.departmentName}</td>
              <td className="num">{e.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}
