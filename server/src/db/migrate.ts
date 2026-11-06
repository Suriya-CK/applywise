/** Creates the tables. Run with: npm run migrate */
import { readFileSync } from "fs";
import path from "path";
import { pool } from "./pool";

async function migrate() {
  const sql = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Database schema is up to date");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
