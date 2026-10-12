import type { FormState } from "../actions";

export function FormMessages({ state }: { state: FormState }) {
  return (
    <div role="status" aria-live="polite">
      {state.message && <p className="success">{state.message}</p>}
      {state.errors?.length ? (
        <div className="alert">
          {state.errors.length === 1 ? (
            state.errors[0]
          ) : (
            <ul>
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
