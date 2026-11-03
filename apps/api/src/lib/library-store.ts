/**
 * 本棚の D1 操作のうち、ルートと cron の両方が使うもの。
 *
 * ファイルの行は版をまたいで使い回すので、「どの版からも参照されず、表紙のサムネイルでもない」
 * ファイルだけを孤児として消す。R2 のオブジェクトは library_r2_purges に積み、cron が消す
 * (送信中のオブジェクトを消さないよう、cron は積んでから少し待つ)。
 */

/** 本 1 冊ぶんの R2 の接頭辞。利用者の入力からは作らない (テナント ID と本の ID だけ)。 */
export function bookPrefix(tenantId: string, bookId: string): string {
  return `library/${tenantId}/${bookId}/`;
}

export function fileR2Key(tenantId: string, bookId: string, fileId: string): string {
  return `${bookPrefix(tenantId, bookId)}files/${fileId}`;
}

const SEGMENT = "[^/]+";
const BOOK_PREFIX = new RegExp(`^library/(${SEGMENT})/(${SEGMENT})/$`);
const FILE_KEY = new RegExp(
  `^library/${SEGMENT}/${SEGMENT}/files/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,
);

/** cron が消してよい形か: 本 1 冊 `library/<t>/<b>/` かファイル 1 つ `library/<t>/<b>/files/<uuid>`。 */
export function parsePurgePrefix(
  prefix: string,
): { kind: "book"; tenantId: string; bookId: string } | { kind: "file" } | null {
  const book = BOOK_PREFIX.exec(prefix);
  if (book?.[1] && book[2]) return { kind: "book", tenantId: book[1], bookId: book[2] };
  if (FILE_KEY.test(prefix)) return { kind: "file" };
  return null;
}

/** どの版からも参照されず、表紙のサムネイル (今の版・取り込み中の版) でもないファイル。 */
const ORPHAN = `f.tenant_id = ? AND f.book_id = ?
  AND NOT EXISTS (SELECT 1 FROM library_revision_files rf WHERE rf.tenant_id = f.tenant_id AND rf.book_id = f.book_id AND rf.file_id = f.id)
  AND NOT EXISTS (SELECT 1 FROM library_books b WHERE b.tenant_id = f.tenant_id AND b.id = f.book_id AND (b.cover_thumb_file_id = f.id OR b.pending_thumb_file_id = f.id))`;

/** 孤児のファイルを R2 の削除待ちに積み、行を消す (2 文。batch の最後に置く)。 */
export function orphanFileStatements(
  db: D1Database,
  tenantId: string,
  bookId: string,
  now: number,
): D1PreparedStatement[] {
  return [
    db
      .prepare(
        `INSERT OR IGNORE INTO library_r2_purges (prefix, created_at) SELECT f.r2_key, ? FROM library_files f WHERE ${ORPHAN}`,
      )
      .bind(now, tenantId, bookId),
    db.prepare(`DELETE FROM library_files AS f WHERE ${ORPHAN}`).bind(tenantId, bookId),
  ];
}

/** discardPendingStatements の中で本の行を書き換える文の位置。 */
const DISCARD_BOOK_UPDATE = 4;

/**
 * discardPendingStatements の batch の結果から、取り込みを本当に捨てたかを返す
 * (署名・動きの時刻が合わず何もしなかったときは false)。
 */
export function discardedPending(results: D1Result[]): boolean {
  return (results[DISCARD_BOOK_UPDATE]?.results?.length ?? 0) > 0;
}

/**
 * 取り込み中の版を捨てる。最初の版 (まだ読める版が無い) なら本ごと削除に回す。
 * `expectRevision` が今の取り込み中の版と違えば何もしない (別のタブが先に進めた)。
 * 捨てたかは `discardedPending` で batch の結果から確かめる。
 */
export function discardPendingStatements(
  db: D1Database,
  tenantId: string,
  bookId: string,
  expectRevision: number,
  expectSignature: string | null,
  now: number,
  /** cron の片付け: この時刻より後に動き (再開・送信) があった取り込みは捨てない。 */
  inactiveBefore: number = Number.MAX_SAFE_INTEGER,
): D1PreparedStatement[] {
  // 版の番号は置き換えで使い直すので、読んだときの取り込み (署名) と同じときだけ捨てる。
  // 動きの時刻の確かめも同じ文で行う (読んだあとに再開・送信されたら捨てない)。
  const match =
    "pending_revision = ? AND pending_signature IS ? AND coalesce(pending_active_at, 0) < ?";
  const still = `EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND ${match})`;
  return [
    db
      .prepare(
        `DELETE FROM library_revision_files WHERE tenant_id = ? AND book_id = ? AND revision = ? AND ${still}`,
      )
      .bind(
        tenantId,
        bookId,
        expectRevision,
        tenantId,
        bookId,
        expectRevision,
        expectSignature,
        inactiveBefore,
      ),
    db
      .prepare(
        `DELETE FROM library_chapters WHERE tenant_id = ? AND book_id = ? AND revision = ? AND ${still}`,
      )
      .bind(
        tenantId,
        bookId,
        expectRevision,
        tenantId,
        bookId,
        expectRevision,
        expectSignature,
        inactiveBefore,
      ),
    // 最初の版の取り消しは本ごと消す (読める版が無い本を棚に残さない)。
    db
      .prepare(
        `INSERT OR IGNORE INTO library_r2_purges (prefix, created_at) SELECT ?, ? FROM library_books WHERE tenant_id = ? AND id = ? AND ${match} AND current_revision = 0`,
      )
      .bind(
        bookPrefix(tenantId, bookId),
        now,
        tenantId,
        bookId,
        expectRevision,
        expectSignature,
        inactiveBefore,
      ),
    db
      .prepare(
        `DELETE FROM library_shelf_entries WHERE tenant_id = ? AND book_id = ? AND EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND ${match} AND current_revision = 0)`,
      )
      .bind(tenantId, bookId, tenantId, bookId, expectRevision, expectSignature, inactiveBefore),
    db
      .prepare(
        `UPDATE library_books SET
          status = CASE WHEN current_revision = 0 THEN 'deleting' ELSE status END,
          pending_revision = NULL, pending_manifest = NULL, pending_signature = NULL,
          pending_thumb_file_id = NULL, pending_active_at = NULL, pending_bytes = 0, updated_at = ?
        WHERE tenant_id = ? AND id = ? AND ${match} RETURNING id`,
      )
      .bind(now, tenantId, bookId, expectRevision, expectSignature, inactiveBefore),
    ...orphanFileStatements(db, tenantId, bookId, now),
  ];
}
