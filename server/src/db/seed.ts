/** Adds a demo user with some applications. Run with: npm run seed */
import bcrypt from "bcryptjs";
import { pool } from "./pool";

async function seed() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ["Demo User", "demo@applywise.dev", passwordHash],
  );
  const userId = rows[0].id;

  await pool.query("DELETE FROM applications WHERE user_id = $1", [userId]);
  const samples = [
    ["Acme Cloud", "Full Stack Developer", "interview", "2026-10-20", 82],
    ["Globex", "Backend Engineer (Node.js)", "applied", "2026-10-28", 74],
    ["Initech", "React Developer", "wishlist", null, null],
    ["Umbrella AI", "AI Engineer", "rejected", "2026-09-15", 61],
  ];
  for (const [company, role, status, appliedOn, score] of samples) {
    await pool.query(
      `INSERT INTO applications (user_id, company, role, status, applied_on, match_score)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, company, role, status, appliedOn, score],
    );
  }
  console.log("Seeded demo user: demo@applywise.dev / password123");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
