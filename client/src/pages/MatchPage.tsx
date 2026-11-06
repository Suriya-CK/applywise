/**
 * AI Match: paste a resume and a job description, and Claude (via our API)
 * returns a fit score, matching / missing skills and suggestions.
 */
import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useApplications } from "../context/ApplicationsContext";
import type { MatchResult } from "../types";

export function MatchPage() {
  const { items, reload } = useApplications();
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [applicationId, setApplicationId] = useState<string>("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const id = applicationId ? Number(applicationId) : undefined;
      const { result } = await api.analyzeMatch(resume, jobDescription, id);
      setResult(result);
      if (id) await reload(); // the score was saved on that application
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <form className="card form" onSubmit={handleSubmit}>
        <h2>AI resume match</h2>
        <p className="muted">Claude compares your resume with a job description and shows what's missing.</p>
        <div className="row">
          <label>
            Your resume (plain text)
            <textarea rows={12} value={resume} onChange={(e) => setResume(e.target.value)} required />
          </label>
          <label>
            Job description
            <textarea rows={12} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} required />
          </label>
        </div>
        <label>
          Save score to application (optional)
          <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            <option value="">Don't save</option>
            {items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.company} · {a.role}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Analysing…" : "Analyse match"}
        </button>
      </form>

      {result && (
        <section className="card result" aria-live="polite">
          <div className="score big">{result.score}%</div>
          <p>{result.summary}</p>
          <div className="row">
            <SkillList title="Matching skills" skills={result.matchingSkills} kind="good" />
            <SkillList title="Missing skills" skills={result.missingSkills} kind="bad" />
          </div>
          <h3>Suggestions</h3>
          <ul>
            {result.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function SkillList({ title, skills, kind }: { title: string; skills: string[]; kind: "good" | "bad" }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="chips">
        {skills.length === 0 && <span className="muted">None</span>}
        {skills.map((s) => (
          <span key={s} className={`chip ${kind}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
