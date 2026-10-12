-- セキュリティ監視 (Cloudflare Access への移行と、不正アクセスの早期検知)。
--
-- security_events   … 認証・認可・エラー・Access のログイン記録などの出来事 (180 日で消す)
-- security_alerts   … 検知ルールが出したアラート (確認・解決の状態を持つ)
-- security_sessions … 利用者ごとの直近のセッション (Access のトークンの発行時刻で新しいサインインを見分ける)
-- security_state    … cron の進み具合 (Access のログをどこまで取り込んだか等)
CREATE TABLE security_events (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'app',
  external_id TEXT,
  actor_id TEXT,
  actor_role TEXT,
  email TEXT,
  ip TEXT,
  country TEXT,
  user_agent TEXT,
  method TEXT,
  path TEXT,
  status INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX security_events_tenant_time_idx ON security_events (tenant_id, created_at);
--> statement-breakpoint
CREATE INDEX security_events_kind_time_idx ON security_events (kind, created_at);
--> statement-breakpoint
CREATE INDEX security_events_actor_time_idx ON security_events (actor_id, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX security_events_external_uq ON security_events (source, external_id);
--> statement-breakpoint
CREATE TABLE security_alerts (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  rule TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}',
  subject TEXT,
  dedupe_key TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  notified_at INTEGER,
  status_changed_by TEXT,
  status_changed_at INTEGER,
  note TEXT,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX security_alerts_dedupe_uq ON security_alerts (tenant_id, dedupe_key);
--> statement-breakpoint
CREATE INDEX security_alerts_tenant_status_idx ON security_alerts (tenant_id, status, last_seen_at);
--> statement-breakpoint
CREATE TABLE security_sessions (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  last_issued_at INTEGER,
  last_session_at INTEGER,
  last_seen_at INTEGER,
  last_ip TEXT,
  last_country TEXT,
  last_user_agent TEXT
);
--> statement-breakpoint
CREATE TABLE security_state (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
-- VS Code の接続コードに、発行したときの Access のトークンを一時的に預ける (交換で渡して消す)。
ALTER TABLE auth_vscode_links ADD COLUMN access_token TEXT;
