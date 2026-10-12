"use client";

import { useFormAction } from "@/components/useFormAction";
import { createCalendar, updateCalendar, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";
import type { CalendarInput } from "@/lib/admin";

export function CalendarForm({ calendarId, initial, scheduleLocked }: { calendarId?: number; initial: CalendarInput; scheduleLocked?: boolean }) {
  const action = calendarId ? updateCalendar.bind(null, calendarId) : createCalendar;
  const [state, onSubmit, pending] = useFormAction<FormState>(action, {});

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="grid2">
        <div className="field">
          <label htmlFor="name">Navn</label>
          <input id="name" name="name" type="text" defaultValue={initial.name} required maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="slug">
            Lenke-navn <span className="hint">(/kalender/…)</span>
          </label>
          <input id="slug" name="slug" type="text" defaultValue={initial.slug} required pattern="[a-z0-9][a-z0-9\-]*" maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="year">År</label>
          <input id="year" name="year" type="number" defaultValue={initial.year} min={2020} max={2100} required />
        </div>
        <div className="field">
          <label htmlFor="start_date">Startdato (luke 1)</label>
          <input id="start_date" name="start_date" type="date" defaultValue={initial.startDate} required readOnly={scheduleLocked} />
        </div>
        <div className="field">
          <label htmlFor="door_count">Antall luker</label>
          <input id="door_count" name="door_count" type="number" defaultValue={initial.doorCount} min={1} max={31} required readOnly={scheduleLocked} />
        </div>
        <div className="field">
          <label htmlFor="timezone">Tidssone</label>
          <input id="timezone" name="timezone" type="text" defaultValue={initial.timezone} required readOnly={scheduleLocked} />
        </div>
        <div className="field">
          <label htmlFor="closes_at">
            Stenger <span className="hint">(lokal tid, siste minutt som teller)</span>
          </label>
          <input id="closes_at" name="closes_at" type="datetime-local" defaultValue={initial.closesAtLocal} required />
        </div>
        <div className="field">
          <label htmlFor="notify_time">
            Daglig e-post kl. <span className="hint">(tomt = av)</span>
          </label>
          <input id="notify_time" name="notify_time" type="time" defaultValue={initial.notifyTime ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="points_correct">Poeng for riktig svar</label>
          <input id="points_correct" name="points_correct" type="number" defaultValue={initial.pointsCorrect} min={0} required />
        </div>
        <div className="field">
          <label htmlFor="same_day_bonus">
            Bonus for svar samme dag <span className="hint">(0 = av)</span>
          </label>
          <input id="same_day_bonus" name="same_day_bonus" type="number" defaultValue={initial.sameDayBonus} min={0} required />
        </div>
        <div className="field">
          <label htmlFor="min_answers_to_count">
            Teller i snittet etter <span className="hint">(antall svar)</span>
          </label>
          <input id="min_answers_to_count" name="min_answers_to_count" type="number" defaultValue={initial.minAnswersToCount} min={0} required />
        </div>
      </div>
      {scheduleLocked && <p className="small">Startdato, antall luker og tidssone er låst fordi noen har svart.</p>}
      <label className="check">
        <input type="checkbox" name="late_answers_allowed" defaultChecked={initial.lateAnswersAllowed} />
        <span>Åpne luker kan besvares fram til kalenderen stenger (av = bare på lukens egen dag)</span>
      </label>
      <label className="check">
        <input type="checkbox" name="shuffle_options" defaultChecked={initial.shuffleOptions} />
        <span>Bland rekkefølgen på svaralternativene for hver deltaker</span>
      </label>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {calendarId ? "Lagre innstillinger" : "Opprett kalender"}
        </button>
      </div>
    </form>
  );
}
