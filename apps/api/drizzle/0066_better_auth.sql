-- Better Auth (Google login and sessions). Its user model is auth_users, so existing ids
-- (= profiles.id) are kept; the columns it needs are added with defaults.
ALTER TABLE auth_users ADD COLUMN name TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE auth_users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE auth_users ADD COLUMN image TEXT;
--> statement-breakpoint
ALTER TABLE auth_users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE auth_users SET updated_at = created_at;
--> statement-breakpoint
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX auth_sessions_token_unique ON auth_sessions (token);
--> statement-breakpoint
CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id);
--> statement-breakpoint
CREATE TABLE auth_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX auth_accounts_user_idx ON auth_accounts (user_id);
--> statement-breakpoint
-- One row per Google account, even if two callbacks for it race.
CREATE UNIQUE INDEX auth_accounts_provider_account_unique ON auth_accounts (provider_id, account_id);
--> statement-breakpoint
CREATE TABLE auth_verifications (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX auth_verifications_identifier_idx ON auth_verifications (identifier);
