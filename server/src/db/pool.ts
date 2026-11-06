/**
 * PostgreSQL connection pool.
 *
 * A "pool" keeps a few open connections and reuses them, because opening a new
 * database connection for every request is slow.
 *
 * We always use parameterised queries ($1, $2 ...) - never string concatenation -
 * which protects us from SQL injection.
 */
import { Pool, types } from "pg";
import { config } from "../config";

// By default `pg` turns DATE columns into JS Date objects at local midnight,
// which can shift the day across time zones. Keep them as "YYYY-MM-DD" strings.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

export const pool = new Pool({ connectionString: config.DATABASE_URL });
