import type { Env } from "../env.js";
import { discardPendingStatements, parsePurgePrefix } from "./library-store.js";

/** 積んでからこれだけ待って消す (送信中のファイルを途中で消さない)。 */
export const PURGE_DELAY_MS = 10 * 60 * 1000;
/** 取り込みが止まったまま、これだけ経った版は捨てる。 */
export const STALE_IMPORT_MS = 7 * 24 * 60 * 60 * 1000;
/** 1 回の cron で使う R2 の呼び出し (list・delete) の上限。ほかの cron と呼び出しの枠を分け合う。 */
const R2_BUDGET = 20;
const ROWS_PER_RUN = 4;

/**
 * 本棚の片付け (15 分 cron)。止まった取り込みを捨て、削除待ちの R2 のオブジェクトを消し、
 * 消し終えた本の行を消す。失敗は次の回にやり直す (行を残す)。
 */
export async function runLibraryPurge(env: Env, now = Date.now()): Promise<void> {
  const bucket = env.LIBRARY_BUCKET;
  if (!bucket) return;

  const stale = await env.DB.prepare(
    "SELECT tenant_id, id, pending_revision, pending_signature FROM library_books WHERE pending_revision IS NOT NULL AND pending_started_at < ? ORDER BY pending_started_at LIMIT 2",
  )
    .bind(now - STALE_IMPORT_MS)
    .all<{
      tenant_id: string;
      id: string;
      pending_revision: number;
      pending_signature: string | null;
    }>();
  for (const book of stale.results)
    await env.DB.batch(
      discardPendingStatements(
        env.DB,
        book.tenant_id,
        book.id,
        book.pending_revision,
        book.pending_signature,
        now,
      ),
    );

  const rows = await env.DB.prepare(
    "SELECT prefix FROM library_r2_purges WHERE created_at <= ? ORDER BY created_at, prefix LIMIT ?",
  )
    .bind(now - PURGE_DELAY_MS, ROWS_PER_RUN)
    .all<{ prefix: string }>();
  let budget = R2_BUDGET;
  for (const { prefix } of rows.results) {
    const target = parsePurgePrefix(prefix);
    if (!target) {
      console.error("[cron] library purge skipped an unexpected prefix");
      continue;
    }
    let done = false;
    while (budget >= 2) {
      const listed = await bucket.list({ prefix, limit: 1000 });
      budget--;
      if (listed.objects.length) {
        await bucket.delete(listed.objects.map((object) => object.key));
        budget--;
      }
      if (!listed.truncated) {
        done = true;
        break;
      }
    }
    if (!done) break;
    const statements = [
      env.DB.prepare("DELETE FROM library_r2_purges WHERE prefix = ?").bind(prefix),
    ];
    // 消し終えた本は行も消す (ファイル・版・章・本棚・位置は外部キーで一緒に消える)。
    if (target.kind === "book")
      statements.push(
        env.DB.prepare(
          "DELETE FROM library_books WHERE tenant_id = ? AND id = ? AND status = 'deleting'",
        ).bind(target.tenantId, target.bookId),
      );
    await env.DB.batch(statements);
  }
}
