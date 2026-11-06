/**
 * ApplicationsContext - combines useReducer (state) with API calls (side effects)
 * and shares them with the whole app.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { api } from "../api/client";
import type { ApplicationInput, Status } from "../types";
import { STATUSES } from "../types";
import { applicationsReducer, initialState, type ApplicationsState } from "./applicationsReducer";

interface ApplicationsContextValue extends ApplicationsState {
  counts: Record<Status, number>;
  reload: () => Promise<void>;
  add: (input: ApplicationInput) => Promise<void>;
  update: (id: number, changes: Partial<ApplicationInput>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

const ApplicationsContext = createContext<ApplicationsContextValue | null>(null);

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(applicationsReducer, initialState);

  // useCallback keeps the same function between renders, so it is safe to use
  // as a useEffect dependency without causing an infinite loop.
  const reload = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const { applications } = await api.listApplications();
      dispatch({ type: "loaded", items: applications });
    } catch (err) {
      dispatch({ type: "failed", error: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function add(input: ApplicationInput) {
    const { application } = await api.createApplication(input);
    dispatch({ type: "added", item: application });
  }

  async function update(id: number, changes: Partial<ApplicationInput>) {
    const { application } = await api.updateApplication(id, changes);
    dispatch({ type: "updated", item: application });
  }

  async function remove(id: number) {
    await api.deleteApplication(id);
    dispatch({ type: "removed", id });
  }

  // useMemo: only recount when the list changes, not on every render.
  const counts = useMemo(() => {
    const result = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const a of state.items) result[a.status] += 1;
    return result;
  }, [state.items]);

  const value: ApplicationsContextValue = {
    ...state,
    counts,
    reload,
    add,
    update,
    remove,
  };

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}

export function useApplications(): ApplicationsContextValue {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw new Error("useApplications must be used inside <ApplicationsProvider>");
  return ctx;
}
