import { describe, it, expect } from "vitest";
import { applicationsReducer, initialState } from "../src/context/applicationsReducer";
import type { Application } from "../src/types";

const make = (id: number, overrides: Partial<Application> = {}): Application => ({
  id, company: `Company ${id}`, role: "Developer", status: "applied", job_description: null,
  notes: null, applied_on: null, match_score: null, updated_at: "2026-11-01T00:00:00Z", ...overrides,
});

describe("applicationsReducer", () => {
  it("sets loading and clears errors", () => {
    const state = applicationsReducer({ ...initialState, error: "old" }, { type: "loading" });
    expect(state).toEqual({ items: [], loading: true, error: null });
  });

  it("stores loaded items", () => {
    const state = applicationsReducer({ ...initialState, loading: true }, { type: "loaded", items: [make(1)] });
    expect(state.items).toHaveLength(1);
    expect(state.loading).toBe(false);
  });

  it("adds new items at the top", () => {
    const state = applicationsReducer({ ...initialState, items: [make(1)] }, { type: "added", item: make(2) });
    expect(state.items.map((a) => a.id)).toEqual([2, 1]);
  });

  it("updates one item without mutating the old state", () => {
    const before = { ...initialState, items: [make(1), make(2)] };
    const after = applicationsReducer(before, { type: "updated", item: make(2, { status: "offer" }) });

    expect(after.items[1].status).toBe("offer");
    expect(before.items[1].status).toBe("applied"); // original untouched
    expect(after).not.toBe(before);
  });

  it("removes an item", () => {
    const state = applicationsReducer({ ...initialState, items: [make(1), make(2)] }, { type: "removed", id: 1 });
    expect(state.items.map((a) => a.id)).toEqual([2]);
  });
});
