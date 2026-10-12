-- Monthly OCR page budget: one reservation per Workflow instance. Kept after book deletion
-- so usage stays traceable.
CREATE TABLE library_ocr_reservations (
  instance_id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  month TEXT NOT NULL,
  pages INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (pages >= 0)
);
--> statement-breakpoint
CREATE INDEX library_ocr_reservations_idx_0 ON library_ocr_reservations (tenant_id, month, owner_id);
