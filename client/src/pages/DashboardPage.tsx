import { useState } from "react";
import { ApplicationCard } from "../components/ApplicationCard";
import { ApplicationForm } from "../components/ApplicationForm";
import { StatsBar } from "../components/StatsBar";
import { useApplications } from "../context/ApplicationsContext";
import type { Status } from "../types";

export function DashboardPage() {
  const { items, loading, error, counts, add, update, remove } = useApplications();
  const [filter, setFilter] = useState<Status | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Derived data: computed from state on each render, not stored separately.
  const visible = filter ? items.filter((a) => a.status === filter) : items;

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <main className="container">
      <StatsBar counts={counts} active={filter} onSelect={setFilter} />
      <ApplicationForm onSubmit={add} />

      <section>
        <h2>
          {filter ? `${filter} applications` : "All applications"} ({visible.length})
        </h2>
        {loading && <p>Loading…</p>}
        {(error || actionError) && <p className="error">{error ?? actionError}</p>}
        {!loading && visible.length === 0 && <p className="muted">Nothing here yet. Add your first application above.</p>}
        <ul className="app-list">
          {visible.map((a) => (
            <ApplicationCard
              key={a.id}
              application={a}
              onStatusChange={(id, status) => run(() => update(id, { status }))}
              onDelete={(id) => {
                if (confirm("Delete this application?")) void run(() => remove(id));
              }}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
