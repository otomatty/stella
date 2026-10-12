/**
 * Monthly OCR page budget. OCR is the paid step of book processing, so the pages a run is about
 * to read are reserved against the owner's and the tenant's monthly limits before any provider
 * call. A reservation row per Workflow instance makes the reservation atomic (one statement) and
 * idempotent (a retried step finds its own row). Rows are never deleted, so usage stays visible
 * after a book is removed.
 */

/** Marks an error message that is safe and useful to show the owner as the job's failure text. */
const USER_FACING = "LIBRARY_USER:";
export const userFacing = (text: string): string => `${USER_FACING}${text}`;
/** The owner-facing text carried by an error, or null for anything else (shown generically). */
export function userMessage(error: unknown): string | null {
  const text = error instanceof Error ? error.message : String(error);
  const at = text.indexOf(USER_FACING);
  return at < 0 ? null : text.slice(at + USER_FACING.length);
}

export const DEFAULT_OCR_PAGES_PER_USER_MONTH = 2000;
export const DEFAULT_OCR_PAGES_PER_TENANT_MONTH = 20000;

export interface OcrLimits {
  perUser: number;
  perTenant: number;
}
export function ocrLimits(env: {
  LIBRARY_OCR_PAGES_PER_USER_MONTH?: string;
  LIBRARY_OCR_PAGES_PER_TENANT_MONTH?: string;
}): OcrLimits {
  const read = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 && value !== undefined && value !== "" ? n : fallback;
  };
  return {
    perUser: read(env.LIBRARY_OCR_PAGES_PER_USER_MONTH, DEFAULT_OCR_PAGES_PER_USER_MONTH),
    perTenant: read(env.LIBRARY_OCR_PAGES_PER_TENANT_MONTH, DEFAULT_OCR_PAGES_PER_TENANT_MONTH),
  };
}

/** The budget month in Japan time (the users' calendar), as "YYYY-MM". */
export function quotaMonth(now = Date.now()): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/**
 * Reserves `pages` for this Workflow instance. Returns null when reserved (or already reserved
 * by an earlier try of the same step), otherwise the owner-facing reason it was refused.
 */
export async function reserveOcrPages(
  db: D1Database,
  p: { instanceId: string; tenantId: string; bookId: string; pages: number; month: string },
  limits: OcrLimits,
): Promise<string | null> {
  const used = (scope: string) =>
    `(SELECT coalesce(sum(pages), 0) FROM library_ocr_reservations WHERE tenant_id = ? AND month = ?${scope})`;
  await db
    .prepare(
      `INSERT INTO library_ocr_reservations (instance_id, tenant_id, owner_id, book_id, month, pages, created_at)
      SELECT ?, b.tenant_id, b.owner_id, b.id, ?, ?, ? FROM library_books b
      WHERE b.tenant_id = ? AND b.id = ?
        AND ${used(" AND owner_id = b.owner_id")} + ? <= ?
        AND ${used("")} + ? <= ?
      ON CONFLICT (instance_id) DO NOTHING`,
    )
    .bind(
      p.instanceId,
      p.month,
      p.pages,
      Date.now(),
      p.tenantId,
      p.bookId,
      p.tenantId,
      p.month,
      p.pages,
      limits.perUser,
      p.tenantId,
      p.month,
      p.pages,
      limits.perTenant,
    )
    .run();
  const reserved = await db
    .prepare("SELECT 1 AS ok FROM library_ocr_reservations WHERE instance_id = ?")
    .bind(p.instanceId)
    .first();
  if (reserved) return null;
  const owner = await db
    .prepare(
      `SELECT ${used(" AND owner_id = b.owner_id")} AS used FROM library_books b WHERE b.tenant_id = ? AND b.id = ?`,
    )
    .bind(p.tenantId, p.month, p.tenantId, p.bookId)
    .first<{ used: number }>();
  return (owner?.used ?? 0) + p.pages > limits.perUser
    ? `今月の読み取りの上限（${limits.perUser}ページ）を超えるため、本文を準備できません。来月に再実行するか、PDFを減らしてください。`
    : `組織の今月の読み取りの上限（${limits.perTenant}ページ）を超えるため、本文を準備できません。管理者に相談してください。`;
}
