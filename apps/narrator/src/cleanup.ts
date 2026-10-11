/** Tombstones outlive any in-flight provider step. Only an exact book prefix can be removed. */
export async function cleanupDeletedBooks(env: Pick<NarratorEnv, "DB" | "BUCKET">): Promise<void> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  // Give initial deletions priority over historical rechecks. Two selects plus
  // sixteen records at three queries each fit the Free plan's 50-query limit.
  const pending = await env.DB.prepare(
    "SELECT d.* FROM library_r2_deletions d JOIN library_books b ON b.tenant_id = d.tenant_id AND b.id = d.book_id WHERE d.not_before <= ? AND b.status = 'deleting' ORDER BY d.not_before, d.prefix LIMIT 16",
  )
    .bind(now)
    .all<{ prefix: string; tenant_id: string; book_id: string; created_at: number }>();
  const historical =
    pending.results.length < 16
      ? (
          await env.DB.prepare(
            "SELECT d.* FROM library_r2_deletions d WHERE d.not_before <= ? AND NOT EXISTS (SELECT 1 FROM library_books b WHERE b.tenant_id = d.tenant_id AND b.id = d.book_id) ORDER BY d.not_before, d.prefix LIMIT ?",
          )
            .bind(now, 16 - pending.results.length)
            .all<(typeof pending.results)[number]>()
        ).results
      : [];
  for (const row of [...pending.results, ...historical]) {
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
      // There is no global Workflow lifetime. Retain its prefix, but back off
      // historical rechecks with age (up to 30 days) instead of scanning daily.
      env.DB.prepare("UPDATE library_r2_deletions SET not_before = ? WHERE prefix = ?").bind(
        now + (book ? day : Math.min(30 * day, Math.max(day, now - row.created_at))),
        row.prefix,
      ),
    ]);
  }
}
