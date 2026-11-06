/**
 * State management for the list of applications, using a reducer.
 *
 * A reducer is a pure function: (currentState, action) => newState.
 * Every change goes through one place, which makes updates predictable and easy
 * to test (see tests/applicationsReducer.test.ts). Same idea as Redux.
 *
 * Rule: never mutate state - always return a NEW object/array.
 */
import type { Application } from "../types";

export interface ApplicationsState {
  items: Application[];
  loading: boolean;
  error: string | null;
}

export type ApplicationsAction =
  | { type: "loading" }
  | { type: "loaded"; items: Application[] }
  | { type: "failed"; error: string }
  | { type: "added"; item: Application }
  | { type: "updated"; item: Application }
  | { type: "removed"; id: number };

export const initialState: ApplicationsState = { items: [], loading: false, error: null };

export function applicationsReducer(state: ApplicationsState, action: ApplicationsAction): ApplicationsState {
  switch (action.type) {
    case "loading":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { items: action.items, loading: false, error: null };
    case "failed":
      return { ...state, loading: false, error: action.error };
    case "added":
      return { ...state, items: [action.item, ...state.items] };
    case "updated":
      return { ...state, items: state.items.map((a) => (a.id === action.item.id ? action.item : a)) };
    case "removed":
      return { ...state, items: state.items.filter((a) => a.id !== action.id) };
  }
}
