/** Tombstones outlive any in-flight provider step. Only an exact book prefix can be removed. */
export async function cleanupDeletedBooks(env: Pick<NarratorEnv, "DB" | "BUCKET">): Promise<void> {
  const rows = await env.DB.prepare(
    "SELECT * FROM library_r2_deletions WHERE not_before <= ? ORDER BY created_at LIMIT 20",
  )
    .bind(Date.now())
    .all<{ prefix: string; tenant_id: string; book_id: string }>();
  for (const row of rows.results) {
    if (row.prefix !== `library/${row.tenant_id}/${row.book_id}/`) continue;
    const book = await env.DB.prepare(
      "SELECT status FROM library_books WHERE tenant_id = ? AND id = ?",
    )
      .bind(row.tenant_id, row.book_id)
      .first<{ status: string }>();
    if (book && book.status !== "deleting") continue;
    for (;;) {
      const list = await env.BUCKET.list({ prefix: row.prefix, limit: 1000 });
      if (list.objects.length) await env.BUCKET.delete(list.objects.map((object) => object.key));
      if (!list.truncated) break;
    }
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM library_books WHERE tenant_id = ? AND id = ? AND status = 'deleting'",
      ).bind(row.tenant_id, row.book_id),
      env.DB.prepare("DELETE FROM library_r2_deletions WHERE prefix = ?").bind(row.prefix),
    ]);
  }
}
