"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like useActionState, but submits through onSubmit so React does not reset the
 * form afterwards. Long forms keep what the user typed when validation fails.
 */
export function useFormAction<S>(action: (state: Awaited<S>, formData: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending] as const;
}
