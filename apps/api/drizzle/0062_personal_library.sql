CREATE UNIQUE INDEX profiles_tenant_id_uq ON profiles (tenant_id, id);
--> statement-breakpoint
CREATE TABLE library_books (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  kind TEXT NOT NULL DEFAULT 'commercial',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, owner_id) REFERENCES profiles (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, id),
  CHECK (length(trim(title)) BETWEEN 1 AND 200),
  CHECK (kind IN ('commercial','in_house'))
);
--> statement-breakpoint
CREATE INDEX library_books_idx_0 ON library_books (tenant_id, owner_id, updated_at);
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
