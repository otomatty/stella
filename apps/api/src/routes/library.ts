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
    const stored = await bucket.put(pdf.r2_key, body, {
      httpMetadata: { contentType: "application/pdf" },
    });
    const head = await bucket.get(pdf.r2_key, { range: { offset: 0, length: 5 } });
    const magic = head ? await head.text() : "";
    if (stored?.size !== pdf.size_bytes || magic !== "%PDF-") {
      await bucket.delete(pdf.r2_key);
      throw new ApiError("PDFファイルを送信してください", 400);
    }
    // A book deleted during the transfer keeps its tombstone; the narrator cron removes the object.
    await c.env.DB.prepare(
      "UPDATE library_book_pdfs SET upload_status = 'completed', page_count = NULL WHERE tenant_id = ? AND book_id = ? AND id = ? AND EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND status IN ('draft','uploading'))",
    )
      .bind(caller.tenantId, book.id, pdf.id, caller.tenantId, book.id)
      .run();
    return c.json({ pdf: pdfView({ ...pdf, upload_status: "completed", page_count: null }) });
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
