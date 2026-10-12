/**
 * Monthly OCR page budget. OCR is the paid step of book processing, so the pages a run is about
 * to read are reserved against the owner's and the tenant's monthly limits before any provider
 * call. A reservation row per Workflow instance makes the reservation atomic (one statement) and
 * idempotent (a retried step finds its own row). Rows are never deleted, so usage stays visible
 * after a book is removed.
 */

/**
 * Failures the owner can act on. Only these fixed texts (and a number) reach the owner: an error
 * carries a code, never free text, so nothing from a provider or a book can be shown.
 */
const USER_FAILURES = {
  pdf_count: () => "PDFの数が上限を超えています",
  pdf_pages: () => "PDFは1〜100ページまでです",
  book_pages: () => "本は1000ページまでです",
  book_bytes: () => "本は合計1GBまでです",
  quota_user: (limit: number) =>
    `今月の読み取りの上限（${limit}ページ）を超えるため、本文を準備できません。来月に再実行するか、PDFを減らしてください。`,
  quota_tenant: (limit: number) =>
    `組織の今月の読み取りの上限（${limit}ページ）を超えるため、本文を準備できません。管理者に相談してください。`,
} satisfies Record<string, (n: number) => string>;
export type UserFailure = keyof typeof USER_FAILURES;
const MARKER = "LIBRARY_USER:";
/** An error message that `userMessage` turns back into the fixed owner-facing text. */
export const userFacing = (code: UserFailure, n = 0): string => `${MARKER}${code}:${n}`;
/** The owner-facing text for an error made with `userFacing`, or null (shown generically). */
export function userMessage(error: unknown): string | null {
  const text = error instanceof Error ? error.message : String(error);
  const match = /LIBRARY_USER:([a-z_]+):(\d{1,9})/.exec(text);
  if (!match?.[1] || !Object.hasOwn(USER_FAILURES, match[1])) return null;
  return USER_FAILURES[match[1] as UserFailure](Number(match[2]));
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
 * by an earlier try of the same step), otherwise an error message made with `userFacing`.
 */
export async function reserveOcrPages(
  db: D1Database,
  p: { instanceId: string; tenantId: string; bookId: string; pages: number; month: string },
  limits: OcrLimits,
): Promise<string | null> {
  // Nothing left to read (e.g. a re-run after OCR finished): no budget is needed, even when a
  // lowered limit is already passed.
  if (p.pages <= 0) return null;
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
    ? userFacing("quota_user", limits.perUser)
    : userFacing("quota_tenant", limits.perTenant);
}
