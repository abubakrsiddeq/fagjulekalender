// Presentational pieces shared by the server-rendered door page and the client answer form.
import { t } from "@/i18n";

export interface ViewOption {
  id: number;
  text: string;
  letter: string;
}

export interface ViewResult {
  optionId: number | null; // null in admin preview
  isCorrect: boolean;
  correctOptionId: number;
  points: number;
  explanation: string;
  sourceTitle: string | null;
  sourceEqsId: string | null;
}

export function StaticOptions({ options, result }: { options: ViewOption[]; result: ViewResult | null }) {
  return (
    <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 8 }} aria-label="Svaralternativer">
      {options.map((o) => {
        const isCorrect = result && o.id === result.correctOptionId;
        const pickedWrong = result && result.optionId === o.id && !isCorrect;
        const picked = result && result.optionId === o.id;
        return (
          <li key={o.id} className={`opt static${isCorrect ? " correct" : ""}${pickedWrong ? " picked-wrong" : ""}`}>
            <span className="k" aria-hidden="true">
              {o.letter}
            </span>
            <span>
              <span className="sr-only">{o.letter}: </span>
              {o.text}
            </span>
            {(isCorrect || picked) && (
              <span className="mark">
                {isCorrect ? `✓ ${t.question.correctOption}` : ""}
                {isCorrect && picked ? " · " : ""}
                {picked ? (isCorrect ? t.question.yourAnswer : `✗ ${t.question.yourAnswer}`) : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ResultBox({ result, preview = false, headingRef }: { result: ViewResult; preview?: boolean; headingRef?: React.Ref<HTMLHeadingElement> }) {
  const ok = preview || result.isCorrect;
  return (
    <div className={`result ${ok ? "ok" : "no"}`}>
      <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: "1.15rem" }}>
        {preview ? "Forhåndsvisning – riktig svar er markert" : result.isCorrect ? t.question.correctTitle(result.points) : t.question.wrongTitle}
      </h2>
      <p>{result.explanation}</p>
      {(result.sourceTitle || result.sourceEqsId) && (
        <p className="src">
          {t.question.source}: {result.sourceTitle}
          {result.sourceEqsId ? ` (${t.question.eqs(result.sourceEqsId)})` : ""}
        </p>
      )}
    </div>
  );
}
