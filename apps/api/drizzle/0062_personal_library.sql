CREATE UNIQUE INDEX profiles_tenant_id_uq ON profiles (tenant_id, id);
--> statement-breakpoint
CREATE TABLE library_books (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  kind TEXT NOT NULL DEFAULT 'commercial',
  visibility TEXT NOT NULL DEFAULT 'private',
  publication_status TEXT NOT NULL DEFAULT 'draft',
  status TEXT NOT NULL DEFAULT 'draft',
  generation INTEGER NOT NULL DEFAULT 1,
  page_count INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, owner_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, id),
  CHECK (length(trim(title)) BETWEEN 1 AND 200),
  CHECK (kind IN ('commercial','in_house')),
  CHECK (visibility IN ('private','restricted','company')),
  CHECK (publication_status IN ('draft','published')),
  CHECK (status IN ('draft','uploading','processing','ready','failed','deleting')),
  CHECK (generation >= 1),
  CHECK (page_count IS NULL OR page_count >= 0)
);
--> statement-breakpoint
CREATE INDEX library_books_idx_0 ON library_books (tenant_id, owner_id, updated_at);
--> statement-breakpoint
CREATE TABLE library_book_pdfs (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  source_file_name TEXT,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'uploading',
  upload_id TEXT,
  page_count INTEGER,
  first_page_no INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, position),
  CHECK (position >= 1),
  CHECK (size_bytes > 0),
  CHECK (upload_status IN ('uploading','completed'))
);
--> statement-breakpoint
CREATE TABLE library_pages (
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  page_no INTEGER NOT NULL,
  image_r2_key TEXT,
  ocr_status TEXT NOT NULL DEFAULT 'pending',
  ocr_markdown TEXT,
  ocr_figures TEXT,
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, page_no),
  CHECK (page_no >= 1),
  CHECK (ocr_status IN ('pending','succeeded','failed'))
);
--> statement-breakpoint
CREATE TABLE library_figures (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  page_no INTEGER NOT NULL,
  caption TEXT,
  r2_key TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id, page_no) REFERENCES library_pages (tenant_id, book_id, page_no) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, file_name),
  CHECK (width > 0 AND height > 0)
);
--> statement-breakpoint
CREATE TABLE library_chapters (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL DEFAULT '',
  speech_hash TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  start_page INTEGER NOT NULL,
  end_page INTEGER NOT NULL,
  edited INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, id),
  UNIQUE (tenant_id, book_id, position),
  CHECK (revision >= 1),
  CHECK (start_page >= 1 AND end_page >= start_page)
);
--> statement-breakpoint
CREATE TABLE library_chapter_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  markdown TEXT NOT NULL,
  speech_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id, chapter_id) REFERENCES library_chapters (tenant_id, book_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, chapter_id, revision)
);
--> statement-breakpoint
CREATE TABLE library_audios (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  r2_key TEXT,
  duration_sec REAL,
  size_bytes INTEGER,
  source_speech_hash TEXT NOT NULL,
  tts_model TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id, chapter_id) REFERENCES library_chapters (tenant_id, book_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, chapter_id, revision),
  CHECK (status IN ('generating','ready','failed'))
);
--> statement-breakpoint
CREATE TABLE library_shelf_entries (
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  reading_status TEXT NOT NULL DEFAULT 'unread',
  favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, profile_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, profile_id, book_id),
  CHECK (reading_status IN ('unread','reading','finished','archived')),
  CHECK (favorite IN (0,1)),
  CHECK (json_valid(tags) AND json_type(tags) = 'array')
);
--> statement-breakpoint
CREATE INDEX library_shelf_entries_idx_0 ON library_shelf_entries (tenant_id, profile_id, updated_at);
--> statement-breakpoint
CREATE INDEX library_shelf_entries_idx_1 ON library_shelf_entries (tenant_id, book_id);
--> statement-breakpoint
CREATE TABLE library_reader_states (
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  text_locator TEXT,
  audio_position_sec REAL NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id, chapter_id) REFERENCES library_chapters (tenant_id, book_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, profile_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, profile_id, book_id, chapter_id),
  CHECK (audio_position_sec >= 0),
  CHECK (version >= 1)
);
--> statement-breakpoint
CREATE INDEX library_reader_states_idx_0 ON library_reader_states (tenant_id, book_id, chapter_id);
--> statement-breakpoint
CREATE TABLE library_annotations (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  kind TEXT NOT NULL,
  locator TEXT,
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id, chapter_id) REFERENCES library_chapters (tenant_id, book_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, profile_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  CHECK (kind IN ('note','bookmark'))
);
--> statement-breakpoint
CREATE INDEX library_annotations_idx_0 ON library_annotations (tenant_id, profile_id, book_id);
--> statement-breakpoint
CREATE INDEX library_annotations_idx_1 ON library_annotations (tenant_id, book_id, chapter_id);
--> statement-breakpoint
CREATE TABLE library_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  generation INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER,
  attempt INTEGER NOT NULL DEFAULT 1,
  error_code TEXT,
  error_message TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  FOREIGN KEY (tenant_id, book_id) REFERENCES library_books (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, created_by) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, book_id, chapter_id) REFERENCES library_chapters (tenant_id, book_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, id),
  CHECK (type IN ('ocr','split','tts')),
  CHECK (status IN ('queued','running','succeeded','failed')),
  CHECK (generation >= 1 AND attempt >= 1)
);
--> statement-breakpoint
CREATE INDEX library_jobs_idx_0 ON library_jobs (tenant_id, book_id, status);
--> statement-breakpoint
CREATE TABLE library_job_usages (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity REAL NOT NULL,
  estimated_cost_usd REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, book_id, job_id) REFERENCES library_jobs (tenant_id, book_id, id) ON DELETE CASCADE,
  CHECK (quantity >= 0)
);
--> statement-breakpoint
CREATE INDEX library_job_usages_idx_0 ON library_job_usages (tenant_id, book_id, job_id);
--> statement-breakpoint
CREATE TABLE library_job_dispatches (
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  dispatched_at INTEGER,
  FOREIGN KEY (tenant_id, book_id, job_id) REFERENCES library_jobs (tenant_id, book_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, book_id, job_id),
  UNIQUE (instance_id)
);
--> statement-breakpoint
CREATE TABLE library_r2_deletions (
  prefix TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  not_before INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX library_r2_deletions_idx_0 ON library_r2_deletions (not_before);
