"use client";

import { useFormAction } from "@/components/useFormAction";
import { useT } from "@/i18n/client";
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
  const a = useT().admin;
  const [state, onSubmit, pending] = useFormAction<FormState>(moveParticipant, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <input type="hidden" name="calendar_id" value={calendarId} />
      <input type="hidden" name="user_id" value={userId} />
      <div className="grid2">
        <div className="field">
          <label htmlFor="department_id">{a.move.newDepartment}</label>
          <select id="department_id" name="department_id" defaultValue={currentId ?? ""} required>
            <option value="" disabled>
              {a.c.choose}
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="move-reason">{a.move.reason}</label>
          <input id="move-reason" name="reason" type="text" required maxLength={500} />
        </div>
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {a.move.submit}
        </button>
      </div>
    </form>
  );
}
