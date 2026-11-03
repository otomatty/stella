/**
 * 本棚 (`/api/library/*`)。利用者が作った `stella-book` 形式の zip を、ブラウザが 1 ファイル
 * ずつ送り、ここで非公開 R2 に保管して本人にだけ配信する。zip はサーバーで展開しない。
 *
 * - 本は本人だけのもの (講師・管理者も他人の本は 404)。共有の仕組みは持たない。
 * - 取り込みは版 (revision) 単位。中身が同じファイルは版をまたいで使い回す。
 * - 配信は同じオリジンの Cookie で `<img>/<audio>/<video>` から直接読める。利用者が上げた
 *   ファイルは HTML として解釈されないよう、許可した Content-Type・nosniff・CSP sandbox で返す。
 */
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  BOOK_PACKAGE_LIMITS,
  contentKeyOf,
  formatBytes,
  isSafePackagePath,
  parseBookManifest,
  planPackageFiles,
  thumbnailContentKey,
  type BookFileKind,
  type BookManifest,
} from "@stella/shared/library/book-package";
import {
  LibraryInputError,
  parseChapterState,
  parseCreateImport,
  parseShelfUpdate,
} from "@stella/shared/library/schemas";
import {
  LIBRARY_SHELF_FILTERS,
  type LibraryBook,
  type LibraryBookDetail,
  type LibraryCapabilities,
  type LibraryChapter,
  type LibraryImportResponse,
  type LibraryImportSlot,
  type LibraryReadingStatus,
  type LibraryShelfEntry,
  type LibraryShelfFilter,
  type LibraryShelfResponse,
} from "@stella/shared/library/types";
import type { Env } from "../env.js";
import { ApiError, errorResponse, getCaller, type Caller } from "../lib/authz.js";
import { requireOwnLibraryBook } from "../lib/library-authz.js";
import { libraryAvailable } from "../lib/library-capabilities.js";
import {
  bookPrefix,
  discardPendingStatements,
  fileR2Key,
  orphanFileStatements,
} from "../lib/library-store.js";

type LibraryContext = Context<{ Bindings: Env }>;

interface BookRow {
  id: string;
  tenant_id: string;
  owner_id: string;
  package_id: string;
  title: string;
  authors: string;
  language: string;
  description: string | null;
  status: LibraryBook["status"];
  current_revision: number;
  pending_revision: number | null;
  pending_manifest: string | null;
  pending_signature: string | null;
  pending_thumb_file_id: string | null;
  pending_active_at: number | null;
  chapter_count: number;
  has_audio: number;
  has_video: number;
  total_bytes: number;
  pending_bytes: number;
  cover_thumb_file_id: string | null;
  created_at: number;
  updated_at: number;
}

interface ShelfRow extends BookRow {
  reading_status: LibraryReadingStatus;
  favorite: number;
  tags: string;
  last_chapter_id: string | null;
  shelf_updated_at: number;
  completed_count: number;
}

interface FileRow {
  id: string;
  book_id: string;
  content_key: string;
  kind: BookFileKind;
  content_type: string;
  size: number;
  r2_key: string;
  status: "pending" | "uploaded";
  multipart_upload_id: string | null;
}

function bookView(row: BookRow): LibraryBook {
  return {
    id: row.id,
    packageId: row.package_id,
    title: row.title,
    authors: JSON.parse(row.authors) as string[],
    language: row.language,
    description: row.description,
    revision: row.current_revision,
    status: row.status,
    chapterCount: row.chapter_count,
    hasAudio: row.has_audio === 1,
    hasVideo: row.has_video === 1,
    totalBytes: row.total_bytes,
    coverUrl:
      row.cover_thumb_file_id && row.current_revision > 0
        ? `/api/library/books/${row.id}/cover?v=${row.current_revision}`
        : null,
    pendingRevision: row.pending_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function entryView(row: ShelfRow): LibraryShelfEntry {
  return {
    book: bookView(row),
    readingStatus: row.reading_status,
    favorite: row.favorite === 1,
    tags: JSON.parse(row.tags) as string[],
    lastChapterId: row.last_chapter_id,
    progress: { completedChapters: row.completed_count, totalChapters: row.chapter_count },
    updatedAt: row.shelf_updated_at,
  };
}

function requireLibrary(env: Env): R2Bucket {
  if (!libraryAvailable(env) || !env.LIBRARY_BUCKET)
    throw new ApiError("本棚は現在利用できません", 403);
  return env.LIBRARY_BUCKET;
}

async function ownBook(env: Env, caller: Caller, id: string): Promise<BookRow> {
  const row = await env.DB.prepare(
    "SELECT * FROM library_books WHERE tenant_id = ? AND id = ? AND owner_id = ? AND status <> 'deleting'",
  )
    .bind(caller.tenantId, id, caller.id)
    .first<BookRow>();
  requireOwnLibraryBook(caller, row);
  if (!row) throw new ApiError("本が見つかりません", 404);
  return row;
}

async function bookFile(env: Env, caller: Caller, bookId: string, fileId: string) {
  const book = await ownBook(env, caller, bookId);
  const file = await env.DB.prepare(
    "SELECT * FROM library_files WHERE tenant_id = ? AND book_id = ? AND id = ?",
  )
    .bind(caller.tenantId, book.id, fileId)
    .first<FileRow>();
  if (!file) throw new ApiError("ファイルが見つかりません", 404);
  return { book, file };
}

const SHELF_SELECT = `SELECT b.*, s.reading_status, s.favorite, s.tags, s.last_chapter_id, s.updated_at AS shelf_updated_at,
  (SELECT count(*) FROM library_reader_states r JOIN library_chapters ch
     ON ch.tenant_id = r.tenant_id AND ch.book_id = r.book_id AND ch.chapter_id = r.chapter_id AND ch.revision = b.current_revision
   WHERE r.tenant_id = s.tenant_id AND r.profile_id = s.profile_id AND r.book_id = b.id AND r.completed = 1) AS completed_count
  FROM library_shelf_entries s JOIN library_books b ON b.tenant_id = s.tenant_id AND b.id = s.book_id`;

async function shelfEntry(env: Env, caller: Caller, bookId: string): Promise<LibraryShelfEntry> {
  const row = await env.DB.prepare(
    `${SHELF_SELECT} WHERE s.tenant_id = ? AND s.profile_id = ? AND b.id = ? AND b.owner_id = ? AND b.status <> 'deleting'`,
  )
    .bind(caller.tenantId, caller.id, bookId, caller.id)
    .first<ShelfRow>();
  if (!row) throw new ApiError("本が見つかりません", 404);
  return entryView(row);
}

function pageNumber(value: string | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || Number(value) > max) throw new ApiError("ページ指定が無効です", 400);
  return Number(value);
}

function failure(c: LibraryContext, error: unknown): Response {
  if (error instanceof LibraryInputError || error instanceof SyntaxError)
    return c.json({ error: error instanceof SyntaxError ? "JSONが無効です" : error.message }, 400);
  return errorResponse(c, error);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function uploadMode(size: number): Pick<LibraryImportSlot, "mode" | "partSize"> {
  return size > BOOK_PACKAGE_LIMITS.singleUploadMaxBytes
    ? { mode: "multipart", partSize: BOOK_PACKAGE_LIMITS.multipartPartBytes }
    : { mode: "single", partSize: null };
}

/** 同じ中身でも種類 (Content-Type) が違えば別のファイルにする。 */
function fileContentKey(crc32: number, size: number, contentType: string): string {
  return `${contentKeyOf(crc32, size)}|${contentType}`;
}

// ---- 配信 ----

/** `bytes=a-b` / `bytes=a-` / `bytes=-n` の 1 範囲だけ。それ以外の書き方は無視して全体を返す。 */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, from = "", to = ""] = match;
  if (!from && !to) return null;
  if (!from) {
    const suffix = Number(to);
    if (suffix === 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(from);
  if (start >= size) return "unsatisfiable";
  const end = to ? Math.min(Number(to), size - 1) : size - 1;
  if (end < start) return null;
  return { start, end };
}

async function serveFile(
  c: LibraryContext,
  bucket: R2Bucket,
  file: Pick<FileRow, "id" | "r2_key" | "size" | "content_type">,
  cacheControl: string,
): Promise<Response> {
  const headers = new Headers({
    "Content-Type": file.content_type,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    ETag: `"${file.id}"`,
    // 利用者が上げたファイルを、同じオリジンの文書として動かさない。
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
  });
  // 本文 (Markdown) を URL で直接開いても、ブラウザに文書として描かせない (画面は fetch で読む)。
  // 画像・音声・動画は <img>/<audio>/<video> で使うので inline のまま。
  if (file.content_type.startsWith("text/")) headers.set("Content-Disposition", "attachment");
  const range = parseRange(c.req.header("Range"), file.size);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${file.size}`);
    return new Response(null, { status: 416, headers });
  }
  const status = range ? 206 : 200;
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${file.size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
  } else headers.set("Content-Length", String(file.size));
  if (c.req.raw.method === "HEAD") return new Response(null, { status, headers });
  const object = await bucket.get(
    file.r2_key,
    range ? { range: { offset: range.start, length: range.end - range.start + 1 } } : undefined,
  );
  if (!object) throw new ApiError("ファイルが見つかりません", 404);
  return new Response(object.body, { status, headers });
}

export const libraryRoute = new Hono<{ Bindings: Env }>();

const smallBody = bodyLimit({
  maxSize: 16 * 1024,
  onError: (c) => c.json({ error: "入力が大きすぎます" }, 400),
});
const importBody = bodyLimit({
  maxSize: 2 * 1024 * 1024,
  onError: (c) => c.json({ error: "book.json とファイルの一覧が大きすぎます" }, 400),
});
// ファイルの本文は R2 へそのまま流し、大きさは登録したファイルの大きさと照らす。
const FILE_BODY = /^\/api\/library\/books\/[^/]+\/files\/[^/]+(\/multipart\/parts\/\d+)?$/;
libraryRoute.use("/api/library/*", (c, next) => {
  if (c.req.method === "PUT" && FILE_BODY.test(c.req.path)) return next();
  if (c.req.method === "POST" && c.req.path === "/api/library/imports") return importBody(c, next);
  return smallBody(c, next);
});

libraryRoute.get("/api/library/capabilities", async (c) => {
  try {
    await getCaller(c);
    return c.json({
      enabled: libraryAvailable(c.env),
      limits: BOOK_PACKAGE_LIMITS,
    } satisfies LibraryCapabilities);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/mine", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibrary(c.env);
    const limit = pageNumber(c.req.query("limit"), 60, 200);
    const offset = pageNumber(c.req.query("offset"), 0, 1_000_000);
    if (limit === 0) throw new ApiError("limitは1以上で指定してください", 400);
    const filter = (c.req.query("filter") ?? "all") as LibraryShelfFilter;
    if (!LIBRARY_SHELF_FILTERS.includes(filter)) throw new ApiError("絞り込みが無効です", 400);
    const conditions = [
      "s.tenant_id = ?",
      "s.profile_id = ?",
      "b.owner_id = ?",
      "b.status <> 'deleting'",
    ];
    if (filter === "favorite") conditions.push("s.favorite = 1");
    else if (filter !== "all") conditions.push(`s.reading_status = '${filter}'`);
    const where = conditions.join(" AND ");
    const args = [caller.tenantId, caller.id, caller.id];
    const [rows, total] = await Promise.all([
      c.env.DB.prepare(
        `${SHELF_SELECT} WHERE ${where} ORDER BY coalesce(s.last_opened_at, b.created_at) DESC, b.id LIMIT ? OFFSET ?`,
      )
        .bind(...args, limit, offset)
        .all<ShelfRow>(),
      c.env.DB.prepare(
        `SELECT count(*) AS count FROM library_shelf_entries s JOIN library_books b ON b.tenant_id = s.tenant_id AND b.id = s.book_id WHERE ${where}`,
      )
        .bind(...args)
        .first<{ count: number }>(),
    ]);
    return c.json({
      entries: rows.results.map(entryView),
      total: total?.count ?? 0,
      limit,
      offset,
    } satisfies LibraryShelfResponse);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/imports", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibrary(c.env);
    const input = parseCreateImport(await c.req.json<unknown>());
    const parsed = parseBookManifest(input.manifest);
    if (!parsed.ok)
      return c.json(
        {
          error: `book.json に問題があります: ${parsed.errors.slice(0, 5).join(" / ")}`,
          details: parsed.errors,
        },
        400,
      );
    const manifest: BookManifest = parsed.value;
    const plan = planPackageFiles(manifest, input.files);
    if (!plan.ok)
      return c.json(
        {
          error: `zip の中身に問題があります: ${plan.errors.slice(0, 5).join(" / ")}`,
          details: plan.errors,
        },
        400,
      );
    const { files, totalBytes } = plan.value;
    const db = c.env.DB;
    const now = Date.now();

    const existing = await db
      .prepare(
        "SELECT * FROM library_books WHERE tenant_id = ? AND owner_id = ? AND package_id = ?",
      )
      .bind(caller.tenantId, caller.id, manifest.id)
      .first<BookRow>();
    if (existing?.status === "deleting")
      throw new ApiError("この本は削除の片付け中です。しばらくしてからもう一度開いてください", 409);
    const used = await db
      .prepare(
        "SELECT coalesce(sum(max(total_bytes, pending_bytes)), 0) AS used FROM library_books WHERE tenant_id = ? AND owner_id = ? AND status <> 'deleting' AND id <> ?",
      )
      .bind(caller.tenantId, caller.id, existing?.id ?? "")
      .first<{ used: number }>();
    if ((used?.used ?? 0) + totalBytes > BOOK_PACKAGE_LIMITS.maxOwnerBytes)
      throw new ApiError(
        `本棚の容量 (${formatBytes(BOOK_PACKAGE_LIMITS.maxOwnerBytes)}) を超えます。読まない本を削除してください`,
        400,
      );

    const thumbKey = thumbnailContentKey(input.thumbnail.sha256);
    const signature = await sha256Hex(
      JSON.stringify({
        manifest,
        files: files.map((file) => [
          file.path,
          fileContentKey(file.crc32, file.size, file.contentType),
        ]),
        thumbKey,
      }),
    );

    const bookId = existing?.id ?? crypto.randomUUID();
    const resuming = Boolean(
      existing?.pending_revision && existing.pending_signature === signature,
    );
    const revision = existing
      ? resuming && existing.pending_revision
        ? existing.pending_revision
        : existing.current_revision + 1
      : 1;

    const known = existing
      ? (
          await db
            .prepare("SELECT * FROM library_files WHERE tenant_id = ? AND book_id = ?")
            .bind(caller.tenantId, bookId)
            .all<FileRow>()
        ).results
      : [];
    const byKey = new Map(known.map((file) => [file.content_key, file]));
    const fresh: {
      id: string;
      key: string;
      kind: BookFileKind;
      type: string;
      size: number;
      r2: string;
    }[] = [];
    const fileFor = (key: string, kind: BookFileKind, type: string, size: number) => {
      const found = byKey.get(key);
      if (found) return found;
      const id = crypto.randomUUID();
      const row: FileRow = {
        id,
        book_id: bookId,
        content_key: key,
        kind,
        content_type: type,
        size,
        r2_key: fileR2Key(caller.tenantId, bookId, id),
        status: "pending",
        multipart_upload_id: null,
      };
      byKey.set(key, row);
      fresh.push({ id, key, kind, type, size, r2: row.r2_key });
      return row;
    };
    const slots: LibraryImportSlot[] = files.map((file) => {
      const row = fileFor(
        fileContentKey(file.crc32, file.size, file.contentType),
        file.kind,
        file.contentType,
        file.size,
      );
      return {
        path: file.path,
        fileId: row.id,
        kind: file.kind,
        size: file.size,
        uploaded: row.status === "uploaded",
        ...uploadMode(file.size),
      };
    });
    const thumb = fileFor(thumbKey, "thumbnail", "image/jpeg", input.thumbnail.size);
    const thumbnail: LibraryImportSlot = {
      path: "",
      fileId: thumb.id,
      kind: "thumbnail",
      size: thumb.size,
      uploaded: thumb.status === "uploaded",
      mode: "single",
      partSize: null,
    };

    if (resuming)
      // 続きから送る: 動きがあったことを記録する (7 日動かない取り込みだけを片付けるため)。
      await db
        .prepare(
          "UPDATE library_books SET pending_active_at = ?, updated_at = ? WHERE tenant_id = ? AND id = ? AND owner_id = ? AND pending_signature = ?",
        )
        .bind(now, now, caller.tenantId, bookId, caller.id, signature)
        .run();
    else {
      const statements: D1PreparedStatement[] = [];
      const pendingColumns = [
        JSON.stringify(manifest),
        signature,
        thumb.id,
        now,
        totalBytes,
      ] as const;
      if (!existing) {
        statements.push(
          db
            .prepare(
              `INSERT INTO library_books (id, tenant_id, owner_id, package_id, title, authors, language, description, status, current_revision,
                pending_revision, pending_manifest, pending_signature, pending_thumb_file_id, pending_active_at, pending_bytes,
                chapter_count, has_audio, has_video, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'importing', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              bookId,
              caller.tenantId,
              caller.id,
              manifest.id,
              manifest.title,
              JSON.stringify(manifest.authors),
              manifest.language,
              manifest.description,
              revision,
              ...pendingColumns,
              manifest.chapters.length,
              Number(manifest.chapters.some((chapter) => chapter.audio)),
              Number(manifest.chapters.some((chapter) => chapter.video)),
              now,
              now,
            ),
        );
      } else {
        // 取り込み中だった別の版は、この新しい版で置き換える (同じ版の番号を使い直す)。
        if (existing.pending_revision)
          statements.push(
            db
              .prepare(
                "DELETE FROM library_revision_files WHERE tenant_id = ? AND book_id = ? AND revision = ?",
              )
              .bind(caller.tenantId, bookId, existing.pending_revision),
            db
              .prepare(
                "DELETE FROM library_chapters WHERE tenant_id = ? AND book_id = ? AND revision = ?",
              )
              .bind(caller.tenantId, bookId, existing.pending_revision),
          );
        statements.push(
          db
            .prepare(
              `UPDATE library_books SET pending_revision = ?, pending_manifest = ?, pending_signature = ?, pending_thumb_file_id = ?,
                pending_active_at = ?, pending_bytes = ?, updated_at = ?
              WHERE tenant_id = ? AND id = ? AND owner_id = ? AND status <> 'deleting'`,
            )
            .bind(revision, ...pendingColumns, now, caller.tenantId, bookId, caller.id),
        );
      }
      statements.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO library_shelf_entries (tenant_id, profile_id, book_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(caller.tenantId, caller.id, bookId, now, now),
        // 行が多くても 1 文で済むよう、JSON の配列を 1 つの値として渡す (D1 の 1 文 100 変数の制限)。
        db
          .prepare(
            `INSERT INTO library_files (id, tenant_id, book_id, content_key, kind, content_type, size, r2_key, status, created_at, updated_at)
            SELECT json_extract(value, '$.id'), ?, ?, json_extract(value, '$.key'), json_extract(value, '$.kind'),
              json_extract(value, '$.type'), json_extract(value, '$.size'), json_extract(value, '$.r2'), 'pending', ?, ?
            FROM json_each(?)`,
          )
          .bind(caller.tenantId, bookId, now, now, JSON.stringify(fresh)),
        db
          .prepare(
            `INSERT INTO library_revision_files (tenant_id, book_id, revision, path, file_id)
            SELECT ?, ?, ?, json_extract(value, '$.path'), json_extract(value, '$.fileId') FROM json_each(?)`,
          )
          .bind(
            caller.tenantId,
            bookId,
            revision,
            JSON.stringify(slots.map(({ path, fileId }) => ({ path, fileId }))),
          ),
        db
          .prepare(
            `INSERT INTO library_chapters (tenant_id, book_id, revision, chapter_id, position, title, text_path, audio_path, video_path)
            SELECT ?, ?, ?, json_extract(value, '$.id'), CAST(key AS INTEGER) + 1, json_extract(value, '$.title'),
              json_extract(value, '$.text'), json_extract(value, '$.audio'), json_extract(value, '$.video')
            FROM json_each(?)`,
          )
          .bind(caller.tenantId, bookId, revision, JSON.stringify(manifest.chapters)),
        // 置き換えた版だけが使っていたファイルを片付ける。
        ...orphanFileStatements(db, caller.tenantId, bookId, now),
      );
      await db.batch(statements);
      const saved = await ownBook(c.env, caller, bookId);
      if (saved.pending_revision !== revision || saved.pending_signature !== signature)
        throw new ApiError("別の画面で取り込みが始まりました。もう一度開いてください", 409);
    }

    return c.json(
      {
        bookId,
        revision,
        update: Boolean(existing && existing.current_revision > 0),
        files: slots,
        thumbnail,
      } satisfies LibraryImportResponse,
      resuming ? 200 : 201,
    );
  } catch (error) {
    return failure(c, error);
  }
});

/** 取り込み中の版に動きがあったことを記録する (7 日動かない取り込みだけを cron が片付ける)。 */
async function touchPendingImport(env: Env, caller: Caller, bookId: string, now: number) {
  await env.DB.prepare(
    "UPDATE library_books SET pending_active_at = ? WHERE tenant_id = ? AND id = ? AND owner_id = ? AND pending_revision IS NOT NULL",
  )
    .bind(now, caller.tenantId, bookId, caller.id)
    .run();
}

/** 送り終えたファイルを「送信済み」にする。消された・本が削除中なら R2 の分も消して 409。 */
async function markUploaded(env: Env, bucket: R2Bucket, caller: Caller, file: FileRow) {
  const now = Date.now();
  await env.DB.prepare(
    "UPDATE library_files SET status = 'uploaded', multipart_upload_id = NULL, updated_at = ? WHERE tenant_id = ? AND id = ? AND status = 'pending' AND EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND status <> 'deleting')",
  )
    .bind(now, caller.tenantId, file.id, caller.tenantId, file.book_id)
    .run();
  await touchPendingImport(env, caller, file.book_id, now);
  const after = await env.DB.prepare(
    "SELECT f.status FROM library_files f JOIN library_books b ON b.tenant_id = f.tenant_id AND b.id = f.book_id WHERE f.tenant_id = ? AND f.id = ? AND b.status <> 'deleting'",
  )
    .bind(caller.tenantId, file.id)
    .first<{ status: string }>();
  if (after?.status !== "uploaded") {
    await bucket.delete(file.r2_key);
    throw new ApiError("取り込みが取り消されました。もう一度開いてください", 409);
  }
}

function contentLength(c: LibraryContext): number {
  const value = c.req.header("Content-Length");
  if (!value || !/^\d+$/.test(value)) throw new ApiError("Content-Length が必要です", 400);
  return Number(value);
}

libraryRoute.put("/api/library/books/:bookId/files/:fileId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    const bucket = requireLibrary(c.env);
    const { file } = await bookFile(c.env, caller, c.req.param("bookId"), c.req.param("fileId"));
    if (file.status === "uploaded") return c.json({ uploaded: true });
    if (file.size > BOOK_PACKAGE_LIMITS.singleUploadMaxBytes)
      throw new ApiError("大きいファイルは分割して送ってください", 400);
    if (contentLength(c) !== file.size)
      throw new ApiError("ファイルの大きさが取り込みの時と違います", 400);
    const body = c.req.raw.body;
    if (!body) throw new ApiError("ファイルの中身がありません", 400);
    let stored: R2Object | null;
    try {
      stored = await bucket.put(file.r2_key, body, {
        httpMetadata: { contentType: file.content_type },
        ...(file.kind === "thumbnail" ? { sha256: file.content_key.slice("thumb-".length) } : {}),
      });
    } catch {
      throw new ApiError("ファイルを保存できませんでした。もう一度送ってください", 400);
    }
    if (!stored || stored.size !== file.size) {
      await bucket.delete(file.r2_key);
      throw new ApiError("ファイルの大きさが取り込みの時と違います", 400);
    }
    await markUploaded(c.env, bucket, caller, file);
    return c.json({ uploaded: true });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/books/:bookId/files/:fileId/multipart", async (c) => {
  try {
    const { caller } = await getCaller(c);
    const bucket = requireLibrary(c.env);
    const { file } = await bookFile(c.env, caller, c.req.param("bookId"), c.req.param("fileId"));
    if (file.status === "uploaded") return c.json({ uploaded: true, uploadId: null });
    if (file.size <= BOOK_PACKAGE_LIMITS.singleUploadMaxBytes)
      throw new ApiError("このファイルは 1 回で送ってください", 400);
    // 前の分割送信は R2 から部分の一覧を取れないので、やり直す (古い方は R2 が期限で捨てる)。
    if (file.multipart_upload_id)
      await bucket
        .resumeMultipartUpload(file.r2_key, file.multipart_upload_id)
        .abort()
        .catch(() => undefined);
    const upload = await bucket.createMultipartUpload(file.r2_key, {
      httpMetadata: { contentType: file.content_type },
    });
    await c.env.DB.prepare(
      "UPDATE library_files SET multipart_upload_id = ?, updated_at = ? WHERE tenant_id = ? AND id = ? AND status = 'pending'",
    )
      .bind(upload.uploadId, Date.now(), caller.tenantId, file.id)
      .run();
    await touchPendingImport(c.env, caller, file.book_id, Date.now());
    return c.json({
      uploaded: false,
      uploadId: upload.uploadId,
      partSize: BOOK_PACKAGE_LIMITS.multipartPartBytes,
    });
  } catch (error) {
    return failure(c, error);
  }
});

function requireUploadId(file: FileRow, given: unknown): string {
  if (typeof given !== "string" || !given || given !== file.multipart_upload_id)
    throw new ApiError("分割送信が見つかりません。最初から送り直してください", 409);
  return given;
}

libraryRoute.put("/api/library/books/:bookId/files/:fileId/multipart/parts/:part", async (c) => {
  try {
    const { caller } = await getCaller(c);
    const bucket = requireLibrary(c.env);
    const { file } = await bookFile(c.env, caller, c.req.param("bookId"), c.req.param("fileId"));
    const uploadId = requireUploadId(file, c.req.query("uploadId"));
    const part = Number(c.req.param("part"));
    const partSize = BOOK_PACKAGE_LIMITS.multipartPartBytes;
    const parts = Math.ceil(file.size / partSize);
    if (!Number.isInteger(part) || part < 1 || part > parts)
      throw new ApiError("部分の番号が無効です", 400);
    const expected = part < parts ? partSize : file.size - partSize * (parts - 1);
    if (contentLength(c) !== expected) throw new ApiError("部分の大きさが違います", 400);
    const body = c.req.raw.body;
    if (!body) throw new ApiError("部分の中身がありません", 400);
    const uploaded = await bucket
      .resumeMultipartUpload(file.r2_key, uploadId)
      .uploadPart(part, body);
    return c.json({ partNumber: uploaded.partNumber, etag: uploaded.etag });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/books/:bookId/files/:fileId/multipart/complete", async (c) => {
  try {
    const { caller } = await getCaller(c);
    const bucket = requireLibrary(c.env);
    const { file } = await bookFile(c.env, caller, c.req.param("bookId"), c.req.param("fileId"));
    // 完了の応答が届かずに送り直された 2 回目: もう送信済みなら成功として返す (ID は消えている)。
    if (file.status === "uploaded") return c.json({ uploaded: true });
    const body = (await c.req.json<unknown>()) as { uploadId?: unknown; parts?: unknown };
    const uploadId = requireUploadId(file, body?.uploadId);
    const expectedParts = Math.ceil(file.size / BOOK_PACKAGE_LIMITS.multipartPartBytes);
    const parts = body?.parts;
    if (
      !Array.isArray(parts) ||
      parts.length !== expectedParts ||
      parts.some(
        (part, index) =>
          !part ||
          typeof part !== "object" ||
          (part as { partNumber?: unknown }).partNumber !== index + 1 ||
          typeof (part as { etag?: unknown }).etag !== "string",
      )
    )
      throw new ApiError("送った部分の一覧が足りません", 400);
    const object = await bucket
      .resumeMultipartUpload(file.r2_key, uploadId)
      .complete(parts as R2UploadedPart[]);
    if (object.size !== file.size) {
      await bucket.delete(file.r2_key);
      await c.env.DB.prepare(
        "UPDATE library_files SET multipart_upload_id = NULL, updated_at = ? WHERE tenant_id = ? AND id = ?",
      )
        .bind(Date.now(), caller.tenantId, file.id)
        .run();
      throw new ApiError("ファイルの大きさが取り込みの時と違います", 400);
    }
    await markUploaded(c.env, bucket, caller, file);
    return c.json({ uploaded: true });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.post("/api/library/books/:bookId/imports/:revision/complete", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const revision = Number(c.req.param("revision"));
    if (book.current_revision === revision && book.pending_revision !== revision)
      return c.json({ book: bookView(book) }); // 2 回目 (別のタブ・再送) は済んだものとして返す。
    if (book.pending_revision !== revision || !book.pending_manifest)
      throw new ApiError("取り込み中の版が見つかりません。もう一度開いてください", 409);
    const db = c.env.DB;
    const missing = await db
      .prepare(
        `SELECT count(*) AS count FROM library_files f WHERE f.tenant_id = ? AND f.book_id = ? AND f.status <> 'uploaded'
          AND (f.id = ? OR EXISTS (SELECT 1 FROM library_revision_files rf WHERE rf.tenant_id = f.tenant_id AND rf.book_id = f.book_id AND rf.revision = ? AND rf.file_id = f.id))`,
      )
      .bind(caller.tenantId, book.id, book.pending_thumb_file_id ?? "", revision)
      .first<{ count: number }>();
    if (missing?.count)
      throw new ApiError(`まだ送っていないファイルが ${missing.count} 個あります`, 409);
    const manifest = JSON.parse(book.pending_manifest) as BookManifest;
    const now = Date.now();
    const sameBook = "tenant_id = ? AND book_id = ?";
    const switched =
      "EXISTS (SELECT 1 FROM library_books WHERE tenant_id = ? AND id = ? AND current_revision = ?)";
    await db.batch([
      db
        .prepare(
          `UPDATE library_books SET current_revision = pending_revision, status = 'ready', cover_thumb_file_id = pending_thumb_file_id,
            total_bytes = pending_bytes, title = ?, authors = ?, language = ?, description = ?, chapter_count = ?, has_audio = ?, has_video = ?,
            pending_revision = NULL, pending_manifest = NULL, pending_signature = NULL, pending_thumb_file_id = NULL,
            pending_active_at = NULL, pending_bytes = 0, updated_at = ?
          WHERE tenant_id = ? AND id = ? AND owner_id = ? AND pending_revision = ? AND status <> 'deleting'
            -- 読んだときと同じ取り込みであること (別のタブが同じ版の番号で置き換えていたら切り替えない)。
            AND pending_signature = ?
            -- 送り終えたかの確かめも同じ文で (確かめてから切り替えるまでの間に置き換わっても漏れない)。
            AND NOT EXISTS (SELECT 1 FROM library_files f WHERE f.tenant_id = library_books.tenant_id AND f.book_id = library_books.id
              AND f.status <> 'uploaded' AND (f.id = library_books.pending_thumb_file_id OR EXISTS (
                SELECT 1 FROM library_revision_files rf WHERE rf.tenant_id = f.tenant_id AND rf.book_id = f.book_id
                  AND rf.revision = library_books.pending_revision AND rf.file_id = f.id)))`,
        )
        .bind(
          manifest.title,
          JSON.stringify(manifest.authors),
          manifest.language,
          manifest.description,
          manifest.chapters.length,
          Number(manifest.chapters.some((chapter) => chapter.audio)),
          Number(manifest.chapters.some((chapter) => chapter.video)),
          now,
          caller.tenantId,
          book.id,
          caller.id,
          revision,
          book.pending_signature,
        ),
      // 前の版の行は要らない。前の版だけが使っていたファイルは片付ける。
      db
        .prepare(
          `DELETE FROM library_revision_files WHERE ${sameBook} AND revision < ? AND ${switched}`,
        )
        .bind(caller.tenantId, book.id, revision, caller.tenantId, book.id, revision),
      db
        .prepare(`DELETE FROM library_chapters WHERE ${sameBook} AND revision < ? AND ${switched}`)
        .bind(caller.tenantId, book.id, revision, caller.tenantId, book.id, revision),
      ...orphanFileStatements(db, caller.tenantId, book.id, now),
    ]);
    const done = await ownBook(c.env, caller, book.id);
    if (done.current_revision !== revision)
      throw new ApiError("取り込みを終えられませんでした。もう一度開いてください", 409);
    return c.json({ book: bookView(done) });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.delete("/api/library/books/:bookId/imports/:revision", async (c) => {
  try {
    const { caller } = await getCaller(c);
    const bucket = requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const revision = Number(c.req.param("revision"));
    if (book.pending_revision !== revision) return c.json({ ok: true });
    const uploads = await c.env.DB.prepare(
      "SELECT r2_key, multipart_upload_id FROM library_files WHERE tenant_id = ? AND book_id = ? AND status = 'pending' AND multipart_upload_id IS NOT NULL",
    )
      .bind(caller.tenantId, book.id)
      .all<{ r2_key: string; multipart_upload_id: string }>();
    await c.env.DB.batch(
      discardPendingStatements(
        c.env.DB,
        caller.tenantId,
        book.id,
        revision,
        book.pending_signature,
        Date.now(),
      ),
    );
    for (const upload of uploads.results)
      await bucket
        .resumeMultipartUpload(upload.r2_key, upload.multipart_upload_id)
        .abort()
        .catch(() => undefined);
    return c.json({ ok: true });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/books/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const entry = await shelfEntry(c.env, caller, book.id);
    const rows = await c.env.DB.prepare(
      `SELECT ch.chapter_id, ch.position, ch.title, ch.text_path, ch.audio_path, ch.video_path,
        r.audio_sec, r.video_sec, r.completed, r.updated_at AS state_updated_at
      FROM library_chapters ch
      LEFT JOIN library_reader_states r ON r.tenant_id = ch.tenant_id AND r.book_id = ch.book_id AND r.chapter_id = ch.chapter_id AND r.profile_id = ?
      WHERE ch.tenant_id = ? AND ch.book_id = ? AND ch.revision = ? ORDER BY ch.position`,
    )
      .bind(caller.id, caller.tenantId, book.id, book.current_revision)
      .all<{
        chapter_id: string;
        position: number;
        title: string;
        text_path: string;
        audio_path: string | null;
        video_path: string | null;
        audio_sec: number | null;
        video_sec: number | null;
        completed: number | null;
        state_updated_at: number | null;
      }>();
    const chapters: LibraryChapter[] = rows.results.map((row) => ({
      id: row.chapter_id,
      position: row.position,
      title: row.title,
      textPath: row.text_path,
      audioPath: row.audio_path,
      videoPath: row.video_path,
      state: {
        audioSec: row.audio_sec ?? 0,
        videoSec: row.video_sec ?? 0,
        completed: row.completed === 1,
        updatedAt: row.state_updated_at,
      },
    }));
    return c.json({ entry, chapters } satisfies LibraryBookDetail);
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/books/:bookId/cover", async (c) => {
  try {
    const { caller } = await getCaller(c);
    const bucket = requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    if (!book.cover_thumb_file_id) throw new ApiError("表紙がありません", 404);
    const { file } = await bookFile(c.env, caller, book.id, book.cover_thumb_file_id);
    if (file.status !== "uploaded") throw new ApiError("表紙がありません", 404);
    // URL に版が入るので、版が変われば別の URL になる。
    return await serveFile(c, bucket, file, "private, max-age=31536000, immutable");
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.get("/api/library/books/:bookId/content/*", async (c) => {
  try {
    const { caller } = await getCaller(c);
    const bucket = requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const prefix = `/api/library/books/${encodeURIComponent(book.id)}/content/`;
    const pathname = new URL(c.req.url).pathname;
    if (!pathname.startsWith(prefix)) throw new ApiError("ファイルが見つかりません", 404);
    let path: string;
    try {
      path = pathname.slice(prefix.length).split("/").map(decodeURIComponent).join("/");
    } catch {
      throw new ApiError("ファイルが見つかりません", 404);
    }
    if (!isSafePackagePath(path)) throw new ApiError("ファイルが見つかりません", 404);
    const file = await c.env.DB.prepare(
      `SELECT f.* FROM library_revision_files rf JOIN library_files f ON f.tenant_id = rf.tenant_id AND f.id = rf.file_id
      WHERE rf.tenant_id = ? AND rf.book_id = ? AND rf.revision = ? AND rf.path = ? AND f.status = 'uploaded'`,
    )
      .bind(caller.tenantId, book.id, book.current_revision, path)
      .first<FileRow>();
    if (!file) throw new ApiError("ファイルが見つかりません", 404);
    return await serveFile(c, bucket, file, "private, no-store");
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.put("/api/library/books/:bookId/chapters/:chapterId/state", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const chapterId = c.req.param("chapterId");
    const input = parseChapterState(await c.req.json<unknown>());
    const chapter = await c.env.DB.prepare(
      "SELECT 1 AS found FROM library_chapters WHERE tenant_id = ? AND book_id = ? AND revision = ? AND chapter_id = ?",
    )
      .bind(caller.tenantId, book.id, book.current_revision, chapterId)
      .first<{ found: number }>();
    if (!chapter) throw new ApiError("章が見つかりません", 404);
    const now = Date.now();
    const audio = input.audioSec ?? null;
    const video = input.videoSec ?? null;
    const completed = input.completed === undefined ? null : Number(input.completed);
    const db = c.env.DB;
    // 項目ごとに、端末の時刻が保存済みより古い送信 (再送・別の端末の遅れた送信) では巻き戻さない。
    // 送らなかった項目の時刻は 0 で入れるので、ほかの項目の時刻を進めない。
    const field = (column: string, clock: string) =>
      `${column} = CASE WHEN excluded.${clock} > 0 AND excluded.${clock} >= library_reader_states.${clock}
        THEN excluded.${column} ELSE library_reader_states.${column} END,
      ${clock} = max(library_reader_states.${clock}, excluded.${clock})`;
    const at = (value: unknown) => (value === null ? 0 : input.clientUpdatedAt);
    const allDone = `NOT EXISTS (SELECT 1 FROM library_chapters ch WHERE ch.tenant_id = ? AND ch.book_id = ? AND ch.revision = ?
      AND NOT EXISTS (SELECT 1 FROM library_reader_states r WHERE r.tenant_id = ch.tenant_id AND r.profile_id = ? AND r.book_id = ch.book_id
        AND r.chapter_id = ch.chapter_id AND r.completed = 1))`;
    await db.batch([
      db
        .prepare(
          `INSERT INTO library_reader_states (tenant_id, profile_id, book_id, chapter_id, audio_sec, video_sec, completed,
            audio_client_at, video_client_at, completed_client_at, updated_at)
          VALUES (?, ?, ?, ?, coalesce(?, 0), coalesce(?, 0), coalesce(?, 0), ?, ?, ?, ?)
          ON CONFLICT (tenant_id, profile_id, book_id, chapter_id) DO UPDATE SET
            ${field("audio_sec", "audio_client_at")},
            ${field("video_sec", "video_client_at")},
            ${field("completed", "completed_client_at")},
            updated_at = excluded.updated_at`,
        )
        .bind(
          caller.tenantId,
          caller.id,
          book.id,
          chapterId,
          audio,
          video,
          completed,
          at(audio),
          at(video),
          at(completed),
          now,
        ),
      db
        .prepare(
          `UPDATE library_shelf_entries SET
            reading_status = CASE WHEN ${allDone} THEN 'finished' WHEN reading_status = 'unread' THEN 'reading' ELSE reading_status END,
            -- 「続きから」の章は、端末の時刻がより新しい送信でだけ動かす (別の端末の遅れた送信で戻さない)。
            last_chapter_id = CASE WHEN ? >= coalesce(last_chapter_client_at, 0) THEN ? ELSE last_chapter_id END,
            last_opened_at = CASE WHEN ? >= coalesce(last_chapter_client_at, 0) THEN ? ELSE last_opened_at END,
            last_chapter_client_at = max(coalesce(last_chapter_client_at, 0), ?),
            updated_at = ?
          WHERE tenant_id = ? AND profile_id = ? AND book_id = ?`,
        )
        .bind(
          caller.tenantId,
          book.id,
          book.current_revision,
          caller.id,
          input.clientUpdatedAt,
          chapterId,
          input.clientUpdatedAt,
          now,
          input.clientUpdatedAt,
          now,
          caller.tenantId,
          caller.id,
          book.id,
        ),
    ]);
    const state = await db
      .prepare(
        "SELECT audio_sec, video_sec, completed, updated_at FROM library_reader_states WHERE tenant_id = ? AND profile_id = ? AND book_id = ? AND chapter_id = ?",
      )
      .bind(caller.tenantId, caller.id, book.id, chapterId)
      .first<{ audio_sec: number; video_sec: number; completed: number; updated_at: number }>();
    return c.json({
      state: {
        audioSec: state?.audio_sec ?? 0,
        videoSec: state?.video_sec ?? 0,
        completed: state?.completed === 1,
        updatedAt: state?.updated_at ?? null,
      },
    });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.put("/api/library/shelf/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const input = parseShelfUpdate(await c.req.json<unknown>());
    const now = Date.now();
    const status = input.readingStatus ?? null;
    const favorite = input.favorite === undefined ? null : Number(input.favorite);
    const tags = input.tags === undefined ? null : JSON.stringify(input.tags);
    const chapter = input.lastChapterId ?? null;
    const chapterAt = input.clientUpdatedAt ?? null;
    // 「続きから」の章は、端末の時刻がより新しい指定でだけ動かす (別の端末の遅れた送信で戻さない)。
    const newer =
      "excluded.last_chapter_id IS NOT NULL AND excluded.last_chapter_client_at >= coalesce(library_shelf_entries.last_chapter_client_at, 0)";
    // null はそのまま。本棚から外れていた本は、ここで戻す。
    await c.env.DB.prepare(
      `INSERT INTO library_shelf_entries (tenant_id, profile_id, book_id, reading_status, favorite, tags,
        last_chapter_id, last_chapter_client_at, last_opened_at, created_at, updated_at)
      VALUES (?, ?, ?, coalesce(?, 'unread'), coalesce(?, 0), coalesce(?, '[]'), ?, ?, CASE WHEN ? IS NULL THEN NULL ELSE ? END, ?, ?)
      ON CONFLICT (tenant_id, profile_id, book_id) DO UPDATE SET
        reading_status = coalesce(?, library_shelf_entries.reading_status),
        favorite = coalesce(?, library_shelf_entries.favorite),
        tags = coalesce(?, library_shelf_entries.tags),
        last_chapter_id = CASE WHEN ${newer} THEN excluded.last_chapter_id ELSE library_shelf_entries.last_chapter_id END,
        last_opened_at = CASE WHEN ${newer} THEN excluded.last_opened_at ELSE library_shelf_entries.last_opened_at END,
        last_chapter_client_at = CASE WHEN ${newer} THEN excluded.last_chapter_client_at ELSE library_shelf_entries.last_chapter_client_at END,
        updated_at = excluded.updated_at`,
    )
      .bind(
        caller.tenantId,
        caller.id,
        book.id,
        status,
        favorite,
        tags,
        chapter,
        chapterAt,
        chapter,
        now,
        now,
        now,
        status,
        favorite,
        tags,
      )
      .run();
    return c.json({ entry: await shelfEntry(c.env, caller, book.id) });
  } catch (error) {
    return failure(c, error);
  }
});

libraryRoute.delete("/api/library/books/:bookId", async (c) => {
  try {
    const { caller } = await getCaller(c);
    requireLibrary(c.env);
    const book = await ownBook(c.env, caller, c.req.param("bookId"));
    const now = Date.now();
    // まず読めなくする (以後は 404)。R2 と行は cron が片付ける。
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE library_books SET status = 'deleting', updated_at = ? WHERE tenant_id = ? AND id = ? AND owner_id = ? AND status <> 'deleting'",
      ).bind(now, caller.tenantId, book.id, caller.id),
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO library_r2_purges (prefix, created_at) VALUES (?, ?)",
      ).bind(bookPrefix(caller.tenantId, book.id), now),
      c.env.DB.prepare(
        "DELETE FROM library_shelf_entries WHERE tenant_id = ? AND book_id = ?",
      ).bind(caller.tenantId, book.id),
    ]);
    return c.json({ ok: true, status: "deleting" }, 202);
  } catch (error) {
    return failure(c, error);
  }
});
