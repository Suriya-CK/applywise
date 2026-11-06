import { pool } from "../db/pool";

export const STATUSES = ["wishlist", "applied", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export interface Application {
  id: number;
  user_id: number;
  company: string;
  role: string;
  status: Status;
  job_description: string | null;
  notes: string | null;
  applied_on: string | null;
  match_score: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApplicationInput {
  company: string;
  role: string;
  status?: Status;
  job_description?: string | null;
  notes?: string | null;
  applied_on?: string | null;
  match_score?: number | null;
}

// Only these columns may be updated - stops a client from changing user_id etc.
const UPDATABLE = ["company", "role", "status", "job_description", "notes", "applied_on", "match_score"] as const;

export async function listApplications(userId: number, status?: Status): Promise<Application[]> {
  const params: unknown[] = [userId];
  let sql = "SELECT * FROM applications WHERE user_id = $1";
  if (status) {
    params.push(status);
    sql += " AND status = $2";
  }
  sql += " ORDER BY updated_at DESC";
  const { rows } = await pool.query<Application>(sql, params);
  return rows;
}

export async function getApplication(userId: number, id: number): Promise<Application | null> {
  // Filtering by user_id too means users can never read each other's data.
  const { rows } = await pool.query<Application>(
    "SELECT * FROM applications WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function createApplication(userId: number, input: ApplicationInput): Promise<Application> {
  const { rows } = await pool.query<Application>(
    `INSERT INTO applications (user_id, company, role, status, job_description, notes, applied_on, match_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      input.company,
      input.role,
      input.status ?? "wishlist",
      input.job_description ?? null,
      input.notes ?? null,
      input.applied_on ?? null,
      input.match_score ?? null,
    ],
  );
  return rows[0];
}

export async function updateApplication(
  userId: number,
  id: number,
  changes: Partial<ApplicationInput>,
): Promise<Application | null> {
  // Build "SET company = $3, status = $4, ..." only for the fields that were sent.
  // Column names come from our fixed UPDATABLE list, never from user input.
  const fields = UPDATABLE.filter((key) => changes[key] !== undefined);
  if (fields.length === 0) return getApplication(userId, id);

  const setClause = fields.map((key, i) => `${key} = $${i + 3}`).join(", ");
  const values = fields.map((key) => changes[key]);

  const { rows } = await pool.query<Application>(
    `UPDATE applications SET ${setClause}, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId, ...values],
  );
  return rows[0] ?? null;
}

export async function deleteApplication(userId: number, id: number): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM applications WHERE id = $1 AND user_id = $2", [id, userId]);
  return (rowCount ?? 0) > 0;
}

export async function countByStatus(userId: number): Promise<Record<Status, number>> {
  const { rows } = await pool.query<{ status: Status; count: string }>(
    "SELECT status, COUNT(*) AS count FROM applications WHERE user_id = $1 GROUP BY status",
    [userId],
  );
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const row of rows) counts[row.status] = Number(row.count);
  return counts;
}
