import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  LibraryInputError,
  parseBookMetadata,
  parseCreatePdf,
  parseShelfUpdate,
} from "@stella/shared/library/schemas";
import type {
  LibraryBook,
  LibraryCapabilities,
  LibraryJob,
  LibraryPdf,
  LibraryReadingStatus,
  LibraryShelfEntry,
} from "@stella/shared/library/types";
import { LIBRARY_LIMITS } from "@stella/shared/library/types";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller, type Caller } from "../lib/authz.js";
import {
  libraryEnabled,
  requireLibraryEnabled,
  requireOwnLibraryBook,
} from "../lib/library-authz.js";

interface BookRow {
  id: string;
  tenant_id: string;
  owner_id: string;
  title: string;
  author: string | null;
  kind: LibraryBook["kind"];
  status: LibraryBook["status"];
  generation: number;
  page_count: number | null;
  created_at: number;
  updated_at: number;
}
interface ShelfRow extends BookRow {
  reading_status: LibraryReadingStatus;
  favorite: number;
  tags: string;
  shelf_updated_at: number;
}
function bookView(row: BookRow): LibraryBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    kind: row.kind,
    status: row.status,
    pageCount: row.page_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
async function ownBook(env: Env, caller: Caller, id: string): Promise<BookRow> {
  const row = await env.DB.prepare(
    "SELECT * FROM library_books WHERE id = ? AND tenant_id = ? AND owner_id = ? AND status <> 'deleting'",
  )
    .bind(id, caller.tenantId, caller.id)
    .first<BookRow>();
  requireOwnLibraryBook(caller, row);
  // The query returns BookRow; the assertion only establishes the non-null value.
  if (!row) throw new ApiError("書籍が見つかりません", 404);
  return row;
}
interface PdfRow {
  id: string;
  position: number;
  file_name: string;
  size_bytes: number;
  r2_key: string;
  upload_status: LibraryPdf["uploadStatus"];
  page_count: number | null;
}
function pdfView(row: PdfRow): LibraryPdf {
  return {
    id: row.id,
    position: row.position,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    uploadStatus: row.upload_status,
    pageCount: row.page_count,
  };
}
async function processingAvailable(env: Env): Promise<boolean> {
  if (!libraryEnabled(env.LIBRARY_ENABLED) || !env.NARRATOR) return false;
  try {
    return (await env.NARRATOR.capabilities()).configured;
  } catch {
    // Metadata remains usable when the processing Worker is unavailable.
    return false;
  }
}
// PDFs can be added or replaced only before processing starts.
function requireUploadable(book: BookRow): void {
  if (book.status !== "draft" && book.status !== "uploading")
    throw new ApiError("処理を始めた書籍にはPDFを追加できません", 409);
}
interface JobRow {
  id: string;
  type: LibraryJob["type"];
  status: LibraryJob["status"];
  attempt: number;
  progress_current: number;
  progress_total: number | null;
  error_message: string | null;
  created_at: number;
  finished_at: number | null;
  generation: number;
  dispatched_at: number | null;
  dispatch_created_at: number | null;
}
function jobView(row: JobRow): LibraryJob {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    attempt: row.attempt,
    progressCurrent: row.progress_current,
    progressTotal: row.progress_total,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}
const JOB_SELECT =
  "SELECT j.*, d.dispatched_at, d.created_at AS dispatch_created_at FROM library_jobs j LEFT JOIN library_job_dispatches d ON d.tenant_id = j.tenant_id AND d.book_id = j.book_id AND d.job_id = j.id";
// A reservation whose RPC never confirmed is sent again after this long.
const REDISPATCH_AFTER_MS = 60_000;
/** startJob is idempotent per attempt; a failure leaves the reservation for the next poll. */
async function dispatch(env: Env, tenantId: string, bookId: string, job: JobRow): Promise<void> {
  try {
    await env.NARRATOR?.startJob({ tenantId, bookId, jobId: job.id, generation: job.generation });
  } catch {
    // The jobs poll re-dispatches; nothing about the book is exposed here.
  }
}
async function requireProcessing(env: Env): Promise<void> {
  if (!(await processingAvailable(env))) throw new ApiError("書籍の処理は現在利用できません", 403);
}
async function bookJob(env: Env, caller: Caller, bookId: string, jobId: string): Promise<JobRow> {
  const row = await env.DB.prepare(
    `${JOB_SELECT} WHERE j.tenant_id = ? AND j.book_id = ? AND j.id = ?`,
  )
    .bind(caller.tenantId, bookId, jobId)
    .first<JobRow>();
  if (!row) throw new ApiError("ジョブが見つかりません", 404);
  return row;
}
function pageNumber(value: string | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || Number(value) > max) throw new ApiError("ページ指定が無効です", 400);
  return Number(value);
}
function failure(c: Parameters<typeof errorResponse>[0], error: unknown): Response {
  if (error instanceof LibraryInputError || error instanceof SyntaxError)
    return c.json({ error: error instanceof SyntaxError ? "JSONが無効です" : error.message }, 400);
  return errorResponse(c, error);
}
export const libraryRoute = new Hono<{ Bindings: Env }>();
const smallBody = bodyLimit({
  maxSize: 16 * 1024,
  onError: (c) => c.json({ error: "入力が大きすぎます" }, 400),
});
// PDF bodies stream to R2; their size is checked against the registered PDF instead.
const PDF_BODY = /^\/api\/library\/books\/[^/]+\/pdfs\/[^/]+$/;
libraryRoute.use("/api/library/*", (c, next) =>
  c.req.method === "PUT" && PDF_BODY.test(c.req.path) ? next() : smallBody(c, next),
);

libraryRoute.get("/api/library/capabilities", async (c) => {
  try {
    await getCaller(c);
    const enabled = libraryEnabled(c.env.LIBRARY_ENABLED);
    const processing = await processingAvailable(c.env);
    return c.json({
      enabled,
      metadata: enabled,
      processingAvailable: processing,
      upload: processing && Boolean(c.env.LIBRARY_BUCKET),
      audio: false,
      sharing: false,
      limits: LIBRARY_LIMITS,
    } satisfies LibraryCapabilities);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/mine", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const limit = pageNumber(c.req.query("limit"), 30, 100);
    const offset = pageNumber(c.req.query("offset"), 0, 1_000_000);
    if (limit === 0) throw new ApiError("limitは1以上で指定してください", 400);
    const where =
      "s.tenant_id = ? AND s.profile_id = ? AND b.owner_id = ? AND b.status <> 'deleting'";
    const args = [caller.tenantId, caller.id, caller.id];
    const [rows, total] = await Promise.all([
      c.env.DB.prepare(
        `SELECT b.*, s.reading_status, s.favorite, s.tags, s.updated_at AS shelf_updated_at FROM library_shelf_entries s JOIN library_books b ON b.tenant_id = s.tenant_id AND b.id = s.book_id WHERE ${where} ORDER BY s.updated_at DESC, b.id LIMIT ? OFFSET ?`,
      )
        .bind(...args, limit, offset)
        .all<ShelfRow>(),
      c.env.DB.prepare(
        `SELECT count(*) AS count FROM library_shelf_entries s JOIN library_books b ON b.tenant_id = s.tenant_id AND b.id = s.book_id WHERE ${where}`,
      )
        .bind(...args)
        .first<{ count: number }>(),
    ]);
    const entries: LibraryShelfEntry[] = rows.results.map((r) => ({
      book: bookView(r),
      readingStatus: r.reading_status,
      favorite: r.favorite === 1,
      tags: JSON.parse(r.tags) as string[],
      updatedAt: r.shelf_updated_at,
    }));
    return c.json({ entries, total: total?.count ?? 0, limit, offset });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/books", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const input = parseBookMetadata(await c.req.json<unknown>(), true);
    const id = crypto.randomUUID(),
      now = Date.now();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO library_books (id, tenant_id, owner_id, title, author, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        id,
        caller.tenantId,
        caller.id,
        input.title,
        input.author ?? null,
        input.kind ?? "commercial",
        now,
        now,
      ),
      c.env.DB.prepare(
        "INSERT INTO library_shelf_entries (tenant_id, profile_id, book_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).bind(caller.tenantId, caller.id, id, now, now),
    ]);
    return c.json({ book: bookView(await ownBook(c.env, caller, id)) }, 201);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/books/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    return c.json({ book: bookView(await ownBook(c.env, caller, c.req.param("bookId"))) });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.patch("/api/library/books/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const row = await ownBook(c.env, caller, c.req.param("bookId"));
    const input = parseBookMetadata(await c.req.json<unknown>(), false);
    await c.env.DB.prepare(
      "UPDATE library_books SET title = coalesce(?, title), author = CASE WHEN ? THEN ? ELSE author END, kind = coalesce(?, kind), updated_at = ? WHERE id = ? AND tenant_id = ? AND owner_id = ? AND status <> 'deleting'",
    )
      .bind(
        input.title ?? null,
        Number(input.author !== undefined),
        input.author ?? null,
        input.kind ?? null,
        Date.now(),
        row.id,
        caller.tenantId,
        caller.id,
      )
      .run();
    return c.json({ book: bookView(await ownBook(c.env, caller, row.id)) });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/books/:bookId/pdfs", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const rows = await c.env.DB.prepare(
      "SELECT * FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? ORDER BY position",
    )
      .bind(caller.tenantId, book.id)
      .all<PdfRow>();
    return c.json({ pdfs: rows.results.map(pdfView) });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/books/:bookId/pdfs", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    requireUploadable(book);
    if (!c.env.LIBRARY_BUCKET || !(await processingAvailable(c.env)))
      throw new ApiError("PDFの登録は現在利用できません", 403);
    const input = parseCreatePdf(await c.req.json<unknown>());
    const id = crypto.randomUUID(),
      now = Date.now();
    // Count, total size and position are decided in the INSERT so concurrent adds cannot exceed them.
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO library_book_pdfs (id, tenant_id, book_id, position, file_name, size_bytes, r2_key, created_at)
        SELECT ?, b.tenant_id, b.id, (SELECT coalesce(max(position), 0) + 1 FROM library_book_pdfs WHERE tenant_id = b.tenant_id AND book_id = b.id), ?, ?, ?, ?
        FROM library_books b WHERE b.tenant_id = ? AND b.id = ? AND b.owner_id = ? AND b.status IN ('draft','uploading')
          AND (SELECT count(*) FROM library_book_pdfs WHERE tenant_id = b.tenant_id AND book_id = b.id) < ?
          AND (SELECT coalesce(sum(size_bytes), 0) FROM library_book_pdfs WHERE tenant_id = b.tenant_id AND book_id = b.id) + ? <= ?`,
      ).bind(
        id,
        input.fileName,
        input.sizeBytes,
        `library/${caller.tenantId}/${book.id}/pdfs/${id}.pdf`,
        now,
        caller.tenantId,
        book.id,
        caller.id,
        LIBRARY_LIMITS.maxBookPdfs,
        input.sizeBytes,
        LIBRARY_LIMITS.maxBookBytes,
      ),
      c.env.DB.prepare(
        "UPDATE library_books SET status = 'uploading', updated_at = ? WHERE tenant_id = ? AND id = ? AND status = 'draft' AND EXISTS (SELECT 1 FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND id = ?)",
      ).bind(now, caller.tenantId, book.id, caller.tenantId, book.id, id),
    ]);
    const row = await c.env.DB.prepare(
      "SELECT * FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND id = ?",
    )
      .bind(caller.tenantId, book.id, id)
      .first<PdfRow>();
    // No row means a guard in the INSERT (owner, status, count or total size) failed.
    if (!row) throw new ApiError("PDFの数か合計サイズが上限を超えています", 409);
    return c.json({ pdf: pdfView(row) }, 201);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.put("/api/library/books/:bookId/pdfs/:pdfId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const bucket = c.env.LIBRARY_BUCKET;
    if (!bucket) throw new ApiError("PDFの登録は現在利用できません", 403);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    requireUploadable(book);
    const pdf = await c.env.DB.prepare(
      "SELECT * FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND id = ?",
    )
      .bind(caller.tenantId, book.id, c.req.param("pdfId"))
      .first<PdfRow>();
    if (!pdf) throw new ApiError("PDFが見つかりません", 404);
    const body = c.req.raw.body;
    if (!body || Number(c.req.header("Content-Length")) !== pdf.size_bytes)
      throw new ApiError("登録したサイズと送信したPDFのサイズが一致しません", 400);
    // Each attempt writes its own key and the row switches to it only after validation, so a
    // failed or concurrent upload never deletes a completed original.
    const key = `library/${caller.tenantId}/${book.id}/pdfs/${pdf.id}-${crypto.randomUUID()}.pdf`;
    const stored = await bucket.put(key, body, {
      httpMetadata: { contentType: "application/pdf" },
    });
    const head = await bucket.get(key, { range: { offset: 0, length: 5 } });
    const magic = head ? await head.text() : "";
    if (stored?.size !== pdf.size_bytes || magic !== "%PDF-") {
      await bucket.delete(key);
      throw new ApiError("PDFファイルを送信してください", 400);
    }
    // A book deleted during the transfer keeps its tombstone; the narrator cron removes the object.
    const switched = await c.env.DB.prepare(
      "UPDATE library_book_pdfs SET r2_key = ?, upload_status = 'completed', page_count = NULL WHERE tenant_id = ? AND book_id = ? AND id = ? AND r2_key = ? AND EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND status IN ('draft','uploading'))",
    )
      .bind(key, caller.tenantId, book.id, pdf.id, pdf.r2_key, caller.tenantId, book.id)
      .run();
    if (!switched.meta.changes) {
      await bucket.delete(key);
      throw new ApiError("このPDFは別の送信で更新されました。もう一度お試しください", 409);
    }
    await bucket.delete(pdf.r2_key);
    return c.json({
      pdf: pdfView({ ...pdf, r2_key: key, upload_status: "completed", page_count: null }),
    });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.delete("/api/library/books/:bookId/pdfs/:pdfId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    requireUploadable(book);
    const pdf = await c.env.DB.prepare(
      "SELECT * FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND id = ?",
    )
      .bind(caller.tenantId, book.id, c.req.param("pdfId"))
      .first<PdfRow>();
    if (!pdf) throw new ApiError("PDFが見つかりません", 404);
    const bucket = c.env.LIBRARY_BUCKET;
    if (!bucket) throw new ApiError("PDFの削除は現在利用できません", 403);
    // Mark it unfinished first: processing cannot start on it, and a failed R2 delete
    // leaves a row the owner can delete again instead of an unreferenced object.
    const marked = await c.env.DB.prepare(
      "UPDATE library_book_pdfs SET upload_status = 'uploading' WHERE tenant_id = ? AND book_id = ? AND id = ? AND r2_key = ? AND EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND status IN ('draft','uploading'))",
    )
      .bind(caller.tenantId, book.id, pdf.id, pdf.r2_key, caller.tenantId, book.id)
      .run();
    if (!marked.meta.changes)
      throw new ApiError("PDFを削除できませんでした。もう一度お試しください", 409);
    await bucket.delete(pdf.r2_key);
    const removed = await c.env.DB.prepare(
      "DELETE FROM library_book_pdfs WHERE tenant_id = ? AND book_id = ? AND id = ? AND r2_key = ?",
    )
      .bind(caller.tenantId, book.id, pdf.id, pdf.r2_key)
      .run();
    // A concurrent upload swapped in a new validated object; that replacement stands.
    if (!removed.meta.changes)
      throw new ApiError("このPDFは別の送信で更新されました。もう一度お試しください", 409);
    return c.json({ ok: true });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/books/:bookId/process", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    if (book.status !== "uploading")
      throw new ApiError(
        book.status === "failed"
          ? "失敗した処理は再実行してください"
          : "この書籍は処理を始められる状態ではありません",
        409,
      );
    await requireProcessing(c.env);
    const jobId = crypto.randomUUID(),
      now = Date.now();
    // One batch: the job exists only with its reservation, and the book freezes its PDFs.
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO library_jobs (id, tenant_id, book_id, generation, type, created_by, created_at)
        SELECT ?, b.tenant_id, b.id, b.generation, 'ocr', b.owner_id, ? FROM library_books b
        WHERE b.tenant_id = ? AND b.id = ? AND b.owner_id = ? AND b.status = 'uploading'
          AND EXISTS (SELECT 1 FROM library_book_pdfs WHERE tenant_id = b.tenant_id AND book_id = b.id)
          AND NOT EXISTS (SELECT 1 FROM library_book_pdfs WHERE tenant_id = b.tenant_id AND book_id = b.id AND upload_status <> 'completed')
          AND NOT EXISTS (SELECT 1 FROM library_jobs WHERE tenant_id = b.tenant_id AND book_id = b.id AND status IN ('queued','running'))`,
      ).bind(jobId, now, caller.tenantId, book.id, caller.id),
      c.env.DB.prepare(
        "INSERT INTO library_job_dispatches (tenant_id, book_id, job_id, instance_id, created_at) SELECT tenant_id, book_id, id, id || '-' || attempt, ? FROM library_jobs WHERE tenant_id = ? AND book_id = ? AND id = ?",
      ).bind(now, caller.tenantId, book.id, jobId),
      c.env.DB.prepare(
        "UPDATE library_books SET status = 'processing', updated_at = ? WHERE tenant_id = ? AND id = ? AND status = 'uploading' AND EXISTS (SELECT 1 FROM library_jobs WHERE tenant_id = ? AND book_id = ? AND id = ?)",
      ).bind(now, caller.tenantId, book.id, caller.tenantId, book.id, jobId),
    ]);
    const job = await c.env.DB.prepare(
      `${JOB_SELECT} WHERE j.tenant_id = ? AND j.book_id = ? AND j.id = ?`,
    )
      .bind(caller.tenantId, book.id, jobId)
      .first<JobRow>();
    // No row means a guard failed: no PDFs, an unfinished upload, or a job already running.
    if (!job) throw new ApiError("送信が済んでいないPDFがあるか、処理がすでに進んでいます", 409);
    await dispatch(c.env, caller.tenantId, book.id, job);
    return c.json({ job: jobView(job) }, 202);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/books/:bookId/jobs", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const rows = await c.env.DB.prepare(
      `${JOB_SELECT} WHERE j.tenant_id = ? AND j.book_id = ? ORDER BY j.created_at DESC LIMIT 20`,
    )
      .bind(caller.tenantId, book.id)
      .all<JobRow>();
    const stale = rows.results.filter(
      (job) =>
        job.status === "queued" &&
        job.generation === book.generation &&
        job.dispatched_at === null &&
        (job.dispatch_created_at ?? 0) < Date.now() - REDISPATCH_AFTER_MS,
    );
    if (stale.length && (await processingAvailable(c.env)))
      for (const job of stale) await dispatch(c.env, caller.tenantId, book.id, job);
    return c.json({ book: bookView(book), jobs: rows.results.map(jobView) });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/books/:bookId/jobs/:jobId/retry", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const job = await bookJob(c.env, caller, book.id, c.req.param("jobId"));
    if (job.status !== "failed" || job.generation !== book.generation)
      throw new ApiError("再実行できるのは失敗した処理だけです", 409);
    await requireProcessing(c.env);
    const now = Date.now();
    // A new attempt gets a new Workflow instance; results of the old one can no longer write.
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE library_jobs SET attempt = attempt + 1, status = 'queued', progress_current = 0, progress_total = NULL, error_code = NULL, error_message = NULL, started_at = NULL, finished_at = NULL
        WHERE tenant_id = ? AND book_id = ? AND id = ? AND attempt = ? AND status = 'failed'
          AND EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND owner_id = ? AND generation = library_jobs.generation AND status <> 'deleting')
          AND NOT EXISTS (SELECT 1 FROM library_jobs other WHERE other.tenant_id = library_jobs.tenant_id AND other.book_id = library_jobs.book_id AND other.status IN ('queued','running'))`,
      ).bind(caller.tenantId, book.id, job.id, job.attempt, caller.tenantId, book.id, caller.id),
      c.env.DB.prepare(
        "UPDATE library_job_dispatches SET instance_id = ?, created_at = ?, dispatched_at = NULL WHERE tenant_id = ? AND book_id = ? AND job_id = ? AND EXISTS (SELECT 1 FROM library_jobs WHERE tenant_id = ? AND book_id = ? AND id = ? AND attempt = ? AND status = 'queued')",
      ).bind(
        `${job.id}-${job.attempt + 1}`,
        now,
        caller.tenantId,
        book.id,
        job.id,
        caller.tenantId,
        book.id,
        job.id,
        job.attempt + 1,
      ),
      c.env.DB.prepare(
        "UPDATE library_books SET status = 'processing', updated_at = ? WHERE tenant_id = ? AND id = ? AND status = 'failed' AND EXISTS (SELECT 1 FROM library_jobs WHERE tenant_id = ? AND book_id = ? AND id = ? AND attempt = ? AND status = 'queued')",
      ).bind(now, caller.tenantId, book.id, caller.tenantId, book.id, job.id, job.attempt + 1),
    ]);
    const retried = await bookJob(c.env, caller, book.id, job.id);
    if (retried.status !== "queued" || retried.attempt !== job.attempt + 1)
      throw new ApiError("この処理はすでに再実行されています", 409);
    await dispatch(c.env, caller.tenantId, book.id, retried);
    return c.json({ job: jobView(retried) }, 202);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.put("/api/library/shelf/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const input = parseShelfUpdate(await c.req.json<unknown>());
    const now = Date.now();
    // Null means keep the existing field; defaults apply only when adding to the shelf.
    await c.env.DB.prepare(`INSERT INTO library_shelf_entries (tenant_id, profile_id, book_id, reading_status, favorite, tags, created_at, updated_at)
      SELECT ?, ?, id, coalesce(?,'unread'), coalesce(?,0), coalesce(?,'[]'), ?, ? FROM library_books WHERE tenant_id = ? AND id = ? AND owner_id = ? AND status <> 'deleting'
      ON CONFLICT (tenant_id, profile_id, book_id) DO UPDATE SET reading_status = coalesce(?, reading_status), favorite = coalesce(?, favorite), tags = coalesce(?, tags), updated_at = excluded.updated_at`)
      .bind(
        caller.tenantId,
        caller.id,
        input.readingStatus ?? null,
        input.favorite === undefined ? null : Number(input.favorite),
        input.tags === undefined ? null : JSON.stringify(input.tags),
        now,
        now,
        caller.tenantId,
        book.id,
        caller.id,
        input.readingStatus ?? null,
        input.favorite === undefined ? null : Number(input.favorite),
        input.tags === undefined ? null : JSON.stringify(input.tags),
      )
      .run();
    return c.json({ ok: true });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.delete("/api/library/shelf/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    await c.env.DB.prepare(
      "DELETE FROM library_shelf_entries WHERE tenant_id = ? AND profile_id = ? AND book_id = ?",
    )
      .bind(caller.tenantId, caller.id, book.id)
      .run();
    return c.json({ ok: true });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.delete("/api/library/books/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const now = Date.now();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE library_books SET status = 'deleting', generation = generation + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND owner_id = ? AND status <> 'deleting'",
      ).bind(now, book.id, caller.tenantId, caller.id),
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO library_r2_deletions (prefix, tenant_id, book_id, created_at, not_before) VALUES (?, ?, ?, ?, ?)",
      ).bind(
        `library/${caller.tenantId}/${book.id}/`,
        caller.tenantId,
        book.id,
        now,
        now + 24 * 60 * 60 * 1000,
      ),
      c.env.DB.prepare(
        "DELETE FROM library_shelf_entries WHERE tenant_id = ? AND book_id = ?",
      ).bind(caller.tenantId, book.id),
    ]);
    return c.json({ ok: true, status: "deleting" }, 202);
  } catch (error) {
    return failure(c, error);
  }
});
