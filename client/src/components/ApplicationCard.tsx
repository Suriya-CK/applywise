import { STATUSES, type Application, type Status } from "../types";

interface Props {
  application: Application;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
}

export function ApplicationCard({ application: a, onStatusChange, onDelete }: Props) {
  return (
    <li className="card app-card">
      <div>
        <h3>{a.role}</h3>
        <p className="muted">
          {a.company}
          {a.applied_on && ` · applied ${a.applied_on}`}
        </p>
        {a.notes && <p className="notes">{a.notes}</p>}
      </div>
      <div className="app-actions">
        {a.match_score !== null && (
          <span className="score" title="AI match score">
            {a.match_score}%
          </span>
        )}
        <select
          aria-label={`Status for ${a.company}`}
          className={`status-${a.status}`}
          value={a.status}
          onChange={(e) => onStatusChange(a.id, e.target.value as Status)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="link danger" onClick={() => onDelete(a.id)} aria-label={`Delete ${a.company}`}>
          Delete
        </button>
      </div>
    </li>
  );
}
