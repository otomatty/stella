import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  LibraryInputError,
  parseBookMetadata,
  parseShelfUpdate,
} from "@stella/shared/library/schemas";
import type {
  LibraryBook,
  LibraryCapabilities,
  LibraryReadingStatus,
  LibraryShelfEntry,
} from "@stella/shared/library/types";
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
async function ownBook(env: Env, caller: Caller, id: string): Promise<BookRow> {
  const row = await env.DB.prepare(
    "SELECT * FROM library_books WHERE id = ? AND tenant_id = ? AND owner_id = ?",
  )
    .bind(id, caller.tenantId, caller.id)
    .first<BookRow>();
  requireOwnLibraryBook(caller, row);
  // The query returns BookRow; the assertion only establishes the non-null value.
  if (!row) throw new ApiError("書籍が見つかりません", 404);
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
libraryRoute.use(
  "/api/library/*",
  bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "入力が大きすぎます" }, 400) }),
);

libraryRoute.get("/api/library/capabilities", async (c) => {
  try {
    await getCaller(c);
    return c.json({ enabled: libraryEnabled(c.env.LIBRARY_ENABLED) } satisfies LibraryCapabilities);
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
    const where = "s.tenant_id = ? AND s.profile_id = ? AND b.owner_id = ?";
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
      "UPDATE library_books SET title = coalesce(?, title), author = CASE WHEN ? THEN ? ELSE author END, kind = coalesce(?, kind), updated_at = ? WHERE id = ? AND tenant_id = ? AND owner_id = ?",
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

libraryRoute.put("/api/library/shelf/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibraryEnabled(c.env.LIBRARY_ENABLED);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const input = parseShelfUpdate(await c.req.json<unknown>());
    const now = Date.now();
    // Null means keep the existing field; defaults apply only when adding to the shelf.
    await c.env.DB.prepare(`INSERT INTO library_shelf_entries (tenant_id, profile_id, book_id, reading_status, favorite, tags, created_at, updated_at)
      SELECT ?, ?, id, coalesce(?,'unread'), coalesce(?,0), coalesce(?,'[]'), ?, ? FROM library_books WHERE tenant_id = ? AND id = ? AND owner_id = ?
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
    // Shelf entries cascade. P1 books have no R2 objects; P2 adds deferred cleanup.
    await c.env.DB.prepare(
      "DELETE FROM library_books WHERE id = ? AND tenant_id = ? AND owner_id = ?",
    )
      .bind(book.id, caller.tenantId, caller.id)
      .run();
    return c.json({ ok: true });
  } catch (error) {
    return failure(c, error);
  }
});
