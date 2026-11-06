-- ApplyWise database schema. Safe to run many times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company         TEXT        NOT NULL,
  role            TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'wishlist'
                  CHECK (status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  job_description TEXT,
  notes           TEXT,
  applied_on      DATE,
  match_score     INTEGER CHECK (match_score BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- We almost always look up applications by their owner, so index that column.
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
