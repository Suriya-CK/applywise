/**
 * Repository = the only place that writes SQL for a table.
 * Routes call these functions instead of talking to the database directly.
 * That keeps routes short and lets tests replace the database with fakes.
 */
import { pool } from "../db/pool";

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

/** A user without the password hash - safe to send to the browser. */
export type PublicUser = Omit<User, "password_hash">;

export async function findUserByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query<User>("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<PublicUser | null> {
  const { rows } = await pool.query<PublicUser>(
    "SELECT id, name, email, created_at FROM users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(name: string, email: string, passwordHash: string): Promise<PublicUser> {
  const { rows } = await pool.query<PublicUser>(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash],
  );
  return rows[0];
}
