/**
 * Form to add a job application.
 *
 * This is a "controlled form": React state holds every input's value, and each
 * input's onChange updates that state. React is the single source of truth.
 */
import { useState, type FormEvent } from "react";
import { STATUSES, type ApplicationInput } from "../types";

interface Props {
  onSubmit: (input: ApplicationInput) => Promise<void>;
}

const empty: ApplicationInput = { company: "", role: "", status: "wishlist", applied_on: "", notes: "" };

export function ApplicationForm({ onSubmit }: Props) {
  const [form, setForm] = useState<ApplicationInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // One handler for every field: uses the input's "name" attribute as the key.
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    if (!form.company.trim() || !form.role.trim()) {
      setError("Company and role are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        applied_on: form.applied_on || null, // send null rather than "" for an empty date
        notes: form.notes || null,
      });
      setForm(empty);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>Add application</h2>
      <div className="row">
        <label>
          Company
          <input name="company" value={form.company} onChange={handleChange} />
        </label>
        <label>
          Role
          <input name="role" value={form.role} onChange={handleChange} />
        </label>
      </div>
      <div className="row">
        <label>
          Status
          <select name="status" value={form.status} onChange={handleChange}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Applied on
          <input type="date" name="applied_on" value={form.applied_on ?? ""} onChange={handleChange} />
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" rows={2} value={form.notes ?? ""} onChange={handleChange} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Add"}
      </button>
    </form>
  );
}
