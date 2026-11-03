-- 本棚の作り直し (2026-11)。PDF を OCR・読み上げで処理する仕組み (narrator) を退役させ、
-- 利用者が作った zip (stella-book 形式: Markdown の本文・朗読音声・解説動画) を保管して
-- 配信する形に変える。登録済みの本は削除してよいと決まったので、旧テーブルは落とす。
-- R2 に残る旧い本のファイルは、接頭辞を library_r2_purges に積み、API の cron が消す。

CREATE TABLE library_r2_purges (
  prefix TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (prefix LIKE 'library/%')
);
--> statement-breakpoint
INSERT OR IGNORE INTO library_r2_purges (prefix, created_at)
  SELECT 'library/' || tenant_id || '/' || id || '/', CAST(strftime('%s', 'now') AS INTEGER) * 1000
  FROM library_books;
--> statement-breakpoint
INSERT OR IGNORE INTO library_r2_purges (prefix, created_at)
  SELECT prefix, CAST(strftime('%s', 'now') AS INTEGER) * 1000
  FROM library_r2_deletions
  WHERE prefix LIKE 'library/%/%/';
--> statement-breakpoint
DROP TABLE IF EXISTS library_ocr_reservations;
--> statement-breakpoint
DROP TABLE IF EXISTS library_job_dispatches;
--> statement-breakpoint
DROP TABLE IF EXISTS library_job_usages;
--> statement-breakpoint
DROP TABLE IF EXISTS library_jobs;
--> statement-breakpoint
DROP TABLE IF EXISTS library_audios;
--> statement-breakpoint
DROP TABLE IF EXISTS library_chapter_revisions;
--> statement-breakpoint
DROP TABLE IF EXISTS library_chapters;
--> statement-breakpoint
DROP TABLE IF EXISTS library_figures;
--> statement-breakpoint
DROP TABLE IF EXISTS library_pages;
--> statement-breakpoint
DROP TABLE IF EXISTS library_book_pdfs;
--> statement-breakpoint
DROP TABLE IF EXISTS library_r2_deletions;
--> statement-breakpoint
DROP TABLE IF EXISTS library_shelf_entries;
--> statement-breakpoint
DROP TABLE IF EXISTS library_books;
--> statement-breakpoint
-- 本 1 冊。版 (revision) は zip を取り込むたびに増える。読めるのは current_revision。
-- pending_revision は取り込み中 (送信の途中で止まった版を含む) の版。
CREATE TABLE library_books (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '[]',
  language TEXT NOT NULL DEFAULT 'ja',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'importing',
  current_revision INTEGER NOT NULL DEFAULT 0,
  pending_revision INTEGER,
  pending_manifest TEXT,
  pending_signature TEXT,
  pending_thumb_file_id TEXT,
  -- 取り込み中の版に最後に動きがあった時刻 (開始・再開・ファイルの送信)。7 日動かなければ捨てる。
  pending_active_at INTEGER,
  chapter_count INTEGER NOT NULL DEFAULT 0,
  has_audio INTEGER NOT NULL DEFAULT 0,
  has_video INTEGER NOT NULL DEFAULT 0,
  total_bytes INTEGER NOT NULL DEFAULT 0,
  pending_bytes INTEGER NOT NULL DEFAULT 0,
  cover_thumb_file_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, owner_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, owner_id, package_id),
  CHECK (length(trim(title)) BETWEEN 1 AND 200),
  CHECK (json_valid(authors) AND json_type(authors) = 'array'),
  CHECK (status IN ('importing','ready','deleting')),
  CHECK (current_revision >= 0),
  CHECK (pending_revision IS NULL OR pending_revision > current_revision),
  CHECK (has_audio IN (0,1)),
  CHECK (has_video IN (0,1)),
  CHECK (total_bytes >= 0 AND pending_bytes >= 0)
);
--> statement-breakpoint
CREATE INDEX library_books_idx_0 ON library_books (tenant_id, owner_id, updated_at);
--> statement-breakpoint
-- 本のファイル。中身が同じ (CRC-32 とサイズ、サムネイルは SHA-256) なら版をまたいで使い回す。
CREATE TABLE library_files (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  content_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  multipart_upload_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, book_id, content_key),
  UNIQUE (r2_key),
  CHECK (kind IN ('cover','text','audio','video','image','thumbnail')),
  CHECK (status IN ('pending','uploaded')),
  CHECK (size >= 0)
);
--> statement-breakpoint
-- 版ごとの「zip の中のパス → ファイル」。
CREATE TABLE library_revision_files (
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  path TEXT NOT NULL,
  file_id TEXT NOT NULL,
  PRIMARY KEY (tenant_id, book_id, revision, path),
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, file_id) REFERENCES library_files (tenant_id, id) ON DELETE CASCADE,
  CHECK (revision >= 1)
);
--> statement-breakpoint
CREATE INDEX library_revision_files_idx_0 ON library_revision_files (tenant_id, file_id);
--> statement-breakpoint
CREATE TABLE library_chapters (
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  chapter_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  text_path TEXT NOT NULL,
  audio_path TEXT,
  video_path TEXT,
  PRIMARY KEY (tenant_id, book_id, revision, chapter_id),
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, revision, position),
  CHECK (revision >= 1),
  CHECK (position >= 1)
);
--> statement-breakpoint
CREATE TABLE library_shelf_entries (
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  reading_status TEXT NOT NULL DEFAULT 'unread',
  favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  last_chapter_id TEXT,
  -- 「続きから」の章を決めた端末の時刻。これより古い送信では章を戻さない。
  last_chapter_client_at INTEGER,
  last_opened_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, profile_id, book_id),
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, profile_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  CHECK (reading_status IN ('unread','reading','finished','archived')),
  CHECK (favorite IN (0,1)),
  CHECK (json_valid(tags) AND json_type(tags) = 'array')
);
--> statement-breakpoint
CREATE INDEX library_shelf_entries_idx_0 ON library_shelf_entries (tenant_id, profile_id, updated_at);
--> statement-breakpoint
-- 章ごとの本人の位置。章 ID は book.json の id なので、版が変わっても引き継ぐ。
CREATE TABLE library_reader_states (
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  audio_sec REAL NOT NULL DEFAULT 0,
  video_sec REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  client_updated_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, profile_id, book_id, chapter_id),
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, profile_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  CHECK (audio_sec >= 0 AND video_sec >= 0),
  CHECK (completed IN (0,1))
);
