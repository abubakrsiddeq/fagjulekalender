"use client";

import { useFormAction } from "@/components/useFormAction";
import { moveParticipant, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function MoveForm({
  calendarId,
  userId,
  currentId,
  departments,
}: {
  calendarId: number;
  userId: number;
  currentId: number | null;
  departments: { id: number; name: string }[];
}) {
  const [state, onSubmit, pending] = useFormAction<FormState>(moveParticipant, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <input type="hidden" name="calendar_id" value={calendarId} />
      <input type="hidden" name="user_id" value={userId} />
      <div className="grid2">
        <div className="field">
          <label htmlFor="department_id">Ny avdeling</label>
          <select id="department_id" name="department_id" defaultValue={currentId ?? ""} required>
            <option value="" disabled>
              Velg…
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="move-reason">Begrunnelse (logges)</label>
          <input id="move-reason" name="reason" type="text" required maxLength={500} />
        </div>
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          Flytt deltaker
        </button>
      </div>
    </form>
  );
}
