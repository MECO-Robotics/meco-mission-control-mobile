import { useState } from "react";

export function useEditorDraft<Draft>(buildDraft: () => Draft) {
  const [state, setState] = useState<{
    draft: Draft;
    id: string | null;
    visible: boolean;
    error: string | null;
  }>(() => ({
    draft: buildDraft(),
    id: null,
    visible: false,
    error: null,
  }));

  const open = (draft: Draft, id: string | null = null) => {
    setState({ draft, id, visible: true, error: null });
  };
  const close = () => {
    setState((current) => ({ ...current, id: null, visible: false, error: null }));
  };
  const updateDraft = (patch: Partial<Draft>) => {
    setState((current) => ({ ...current, draft: { ...current.draft, ...patch }, error: null }));
  };
  const setError = (error: string) => {
    setState((current) => ({ ...current, error }));
  };
  const complete = (ok: boolean, failureMessage: string) => {
    setState((current) => {
      if (current !== state) return current;
      return ok
        ? { ...current, id: null, visible: false, error: null }
        : { ...current, error: failureMessage };
    });
  };

  const draft: Readonly<Draft> = state.draft;
  return {
    view: { ...state, draft, close, updateDraft } as const,
    open,
    setError,
    complete,
  };
}
