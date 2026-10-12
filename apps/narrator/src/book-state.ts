import type { NarratorJobRequest } from "@stella/shared/library/types";
export function readChapterState(db: D1Database, p: NarratorJobRequest) {
  // Read the plan and persisted prefix from one SQLite snapshot. A sibling's
  // first chapter batch must never look like a complete legacy book.
  return db
    .prepare(
      "SELECT title, chapter_plan_key, (SELECT count(*) FROM library_chapters c WHERE c.tenant_id = b.tenant_id AND c.book_id = b.id) AS chapter_count FROM library_books b WHERE tenant_id = ? AND id = ?",
    )
    .bind(p.tenantId, p.bookId)
    .first<{ title: string; chapter_plan_key: string | null; chapter_count: number }>();
}
