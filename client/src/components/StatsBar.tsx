import { STATUSES, type Status } from "../types";

interface Props {
  counts: Record<Status, number>;
  active: Status | null;
  onSelect: (status: Status | null) => void;
}

/** Shows how many applications are in each status; click one to filter. */
export function StatsBar({ counts, active, onSelect }: Props) {
  return (
    <div className="stats">
      {STATUSES.map((status) => (
        <button
          key={status}
          className={`stat status-${status} ${active === status ? "active" : ""}`}
          onClick={() => onSelect(active === status ? null : status)}
          aria-pressed={active === status}
        >
          <strong>{counts[status]}</strong>
          <span>{status}</span>
        </button>
      ))}
    </div>
  );
}
