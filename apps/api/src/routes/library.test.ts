import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LibraryBookDetail,
  LibraryImportResponse,
  LibraryShelfResponse,
} from "@stella/shared/library/types";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { PURGE_DELAY_MS, runLibraryPurge } from "../lib/library-purge.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { libraryRoute, parseRange } from "./library.js";

// 分割送信を小さな大きさで確かめるため、送り方のしきい値だけを小さくする。
vi.mock("@stella/shared/library/book-package", async (importOriginal) => {
  const original = await importOriginal<typeof import("@stella/shared/library/book-package")>();
  return {
    ...original,
    BOOK_PACKAGE_LIMITS: {
      ...original.BOOK_PACKAGE_LIMITS,
      singleUploadMaxBytes: 16,
      multipartPartBytes: 8,
    },
  };
});

const SECRET = "library-test-secret";
const PACKAGE_ID = "6f1c2a8e-1b2c-4d3e-8f90-123456789abc";
const encoder = new TextEncoder();

/** R2 の代わり (テストで使う操作だけ)。 */
function memoryBucket() {
  const objects = new Map<string, Uint8Array>();
  const uploads = new Map<string, Map<number, Uint8Array>>();
  const bytes = async (body: unknown) =>
    new Uint8Array(await new Response(body as BodyInit).arrayBuffer());
  const hex = async (data: Uint8Array) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  const bucket = {
    async put(key: string, body: unknown, options?: { sha256?: string }) {
      const data = await bytes(body);
      if (options?.sha256 && (await hex(data)) !== options.sha256) throw new Error("checksum");
      objects.set(key, data);
      return { key, size: data.length };
    },
    async get(key: string, options?: { range?: { offset: number; length: number } }) {
      const data = objects.get(key);
      if (!data) return null;
      const range = options?.range;
      const slice = range ? data.slice(range.offset, range.offset + range.length) : data;
      return { body: new Response(slice).body, size: data.length };
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) objects.delete(key);
    },
    async list({ prefix }: { prefix: string }) {
      return {
        objects: [...objects.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ key })),
        truncated: false,
      };
    },
    async createMultipartUpload(key: string) {
      const uploadId = crypto.randomUUID();
      uploads.set(uploadId, new Map());
      return { key, uploadId };
    },
    resumeMultipartUpload(key: string, uploadId: string) {
      return {
        async uploadPart(partNumber: number, body: unknown) {
          uploads.get(uploadId)?.set(partNumber, await bytes(body));
          return { partNumber, etag: `etag-${partNumber}` };
        },
        async complete(parts: { partNumber: number }[]) {
          const stored = uploads.get(uploadId);
          if (!stored) throw new Error("no upload");
          const chunks = parts.map((part) => stored.get(part.partNumber) ?? new Uint8Array());
          const data = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
          let at = 0;
          for (const chunk of chunks) {
            data.set(chunk, at);
            at += chunk.length;
          }
          objects.set(key, data);
          uploads.delete(uploadId);
          return { key, size: data.length };
        },
        async abort() {
          uploads.delete(uploadId);
        },
      };
    },
  };
  return { bucket: bucket as unknown as R2Bucket, objects };
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function sha256(data: Uint8Array): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** zip の中身の代わり (パス → 中身)。 */
function bookFiles(overrides: Record<string, string> = {}): Record<string, Uint8Array> {
  const base: Record<string, string> = {
    "cover.webp": "cover-bytes",
    "chapters/01.md": "# 第1章\n\n本文です。![図](../images/fig.png)",
    "chapters/02.md": "# 第2章",
    "audio/01.m4a": "audio-bytes-0123456789",
    "images/fig.png": "png",
    ...overrides,
  };
  return Object.fromEntries(
    Object.entries(base).map(([path, text]) => [path, encoder.encode(text)]),
  );
}

const manifest = {
  format: "stella-book",
  version: 1,
  id: PACKAGE_ID,
  title: "ソフトウェアエンジニアリングの基礎",
  authors: ["著者"],
  cover: "cover.webp",
  chapters: [
    { id: "ch01", title: "第1章", text: "chapters/01.md", audio: "audio/01.m4a" },
    { id: "ch02", title: "第2章", text: "chapters/02.md" },
  ],
};
const thumbnail = encoder.encode("jpeg-thumbnail");

let db: ReturnType<typeof sqliteD1>;
let storage: ReturnType<typeof memoryBucket>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('ses','SES',1,1), ('other-tenant','Other',1,1);
    INSERT INTO profiles (id, tenant_id, role, display_name, disabled, created_at) VALUES
      ('owner','ses','student','Owner',0,1),
      ('other','ses','student','Other',0,1),
      ('outsider','other-tenant','student','Outsider',0,1),
      ('admin','ses','admin','Admin',0,1),
      ('disabled','ses','student','Disabled',1,1);
  `);
  storage = memoryBucket();
  env = { DB: db.binding, AUTH_JWT_SECRET: SECRET, LIBRARY_BUCKET: storage.bucket } as Env;
  app = mountTestApp(env, libraryRoute).app;
});
afterEach(() => db.sqlite.close());

async function call(path: string, init: RequestInit & { as?: string } = {}) {
  const { as = "owner", ...rest } = init;
  return request(app, env, path, {
    ...rest,
    token: await signAccessToken(SECRET, as, `${as}@example.test`),
  });
}

async function startImport(
  files: Record<string, Uint8Array> = bookFiles(),
  book: unknown = manifest,
  as = "owner",
) {
  return call("/api/library/imports", {
    as,
    method: "POST",
    body: JSON.stringify({
      manifest: book,
      files: [
        { path: "book.json", size: 10, crc32: 1 },
        ...Object.entries(files).map(([path, data]) => ({
          path,
          size: data.length,
          crc32: crc32(data),
        })),
      ],
      thumbnail: { size: thumbnail.length, sha256: await sha256(thumbnail) },
    }),
  });
}

async function put(path: string, data: Uint8Array, as = "owner") {
  return call(path, {
    as,
    method: "PUT",
    body: data,
    headers: { "Content-Length": String(data.length) },
  });
}

/** 取り込みを始めて、送るべきファイルを全部送り、完了させる。 */
async function importBook(files = bookFiles(), book: unknown = manifest) {
  const started = await startImport(files, book);
  expect([200, 201]).toContain(started.status);
  const plan = await json<LibraryImportResponse>(started);
  const sent = new Set<string>();
  for (const slot of [...plan.files, plan.thumbnail]) {
    if (slot.uploaded || sent.has(slot.fileId)) continue;
    sent.add(slot.fileId);
    const data = slot.kind === "thumbnail" ? thumbnail : files[slot.path];
    if (!data) throw new Error(`missing ${slot.path}`);
    const base = `/api/library/books/${plan.bookId}/files/${slot.fileId}`;
    if (slot.mode === "single") expect((await put(base, data)).status).toBe(200);
    else {
      const created = await json<{ uploadId: string; partSize: number }>(
        await call(`${base}/multipart`, { method: "POST" }),
      );
      const parts = [];
      for (let n = 1, at = 0; at < data.length; n++, at += created.partSize) {
        const res = await put(
          `${base}/multipart/parts/${n}?uploadId=${created.uploadId}`,
          data.slice(at, at + created.partSize),
        );
        expect(res.status).toBe(200);
        parts.push(await json<{ partNumber: number; etag: string }>(res));
      }
      const done = await call(`${base}/multipart/complete`, {
        method: "POST",
        body: JSON.stringify({ uploadId: created.uploadId, parts }),
      });
      expect(done.status).toBe(200);
    }
  }
  const completed = await call(
    `/api/library/books/${plan.bookId}/imports/${plan.revision}/complete`,
    { method: "POST" },
  );
  expect(completed.status).toBe(200);
  return { plan, sent };
}

describe("library import", () => {
  it("imports a book, shows it on the shelf with its cover and serves its files", async () => {
    const { plan, sent } = await importBook();
    expect(plan.update).toBe(false);
    expect(sent.size).toBe(6); // 5 files + thumbnail
    const shelf = await json<LibraryShelfResponse>(await call("/api/library/mine"));
    expect(shelf.total).toBe(1);
    expect(shelf.entries[0]?.book).toMatchObject({
      title: "ソフトウェアエンジニアリングの基礎",
      authors: ["著者"],
      status: "ready",
      revision: 1,
      chapterCount: 2,
      hasAudio: true,
      hasVideo: false,
      coverUrl: `/api/library/books/${plan.bookId}/cover?v=1`,
    });
    const detail = await json<LibraryBookDetail>(await call(`/api/library/books/${plan.bookId}`));
    expect(detail.chapters.map((chapter) => [chapter.id, chapter.audioPath])).toEqual([
      ["ch01", "audio/01.m4a"],
      ["ch02", null],
    ]);

    const text = await call(`/api/library/books/${plan.bookId}/content/chapters/01.md`);
    expect(text.status).toBe(200);
    expect(await text.text()).toContain("本文です");
    expect(text.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(text.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(text.headers.get("Content-Security-Policy")).toBe("sandbox; default-src 'none'");
    expect(text.headers.get("Cache-Control")).toBe("private, no-store");

    const cover = await call(`/api/library/books/${plan.bookId}/cover?v=1`);
    expect(cover.status).toBe(200);
    expect(cover.headers.get("Content-Type")).toBe("image/jpeg");
    expect(cover.headers.get("Cache-Control")).toContain("immutable");
    expect(new Uint8Array(await cover.arrayBuffer())).toEqual(thumbnail);
  });

  it("serves byte ranges for audio, HEAD and unsatisfiable ranges", async () => {
    const { plan } = await importBook();
    const path = `/api/library/books/${plan.bookId}/content/audio/01.m4a`;
    const partial = await call(path, { headers: { Range: "bytes=2-5" } });
    expect(partial.status).toBe(206);
    expect(partial.headers.get("Content-Range")).toBe("bytes 2-5/22");
    expect(await partial.text()).toBe("dio-");
    const suffix = await call(path, { headers: { Range: "bytes=-4" } });
    expect(await suffix.text()).toBe("6789");
    const head = await call(path, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("Content-Length")).toBe("22");
    const outside = await call(path, { headers: { Range: "bytes=99-" } });
    expect(outside.status).toBe(416);
    expect(outside.headers.get("Content-Range")).toBe("bytes */22");
  });

  it("refuses paths outside the book and files that are not in the current version", async () => {
    const { plan } = await importBook();
    for (const path of ["..%2Fx", "chapters/../book.json", "book.json", "chapters%2F03.md"])
      expect((await call(`/api/library/books/${plan.bookId}/content/${path}`)).status).toBe(404);
  });

  it("keeps every book private to its owner, whatever the role", async () => {
    const { plan } = await importBook();
    for (const as of ["other", "outsider", "admin"]) {
      expect((await call(`/api/library/books/${plan.bookId}`, { as })).status).toBe(404);
      expect(
        (await call(`/api/library/books/${plan.bookId}/content/chapters/01.md`, { as })).status,
      ).toBe(404);
      expect(
        (await call(`/api/library/books/${plan.bookId}`, { as, method: "DELETE" })).status,
      ).toBe(404);
      expect(
        (await json<LibraryShelfResponse>(await call("/api/library/mine", { as }))).total,
      ).toBe(0);
    }
    expect((await call("/api/library/mine", { as: "disabled" })).status).toBe(403);
    // 同じ ID の zip でも別の人なら別の本になる。
    const theirs = await json<LibraryImportResponse>(
      await startImport(bookFiles(), manifest, "other"),
    );
    expect(theirs.bookId).not.toBe(plan.bookId);
  });

  it("resumes an interrupted import without sending finished files again", async () => {
    const first = await json<LibraryImportResponse>(await startImport());
    const cover = first.files.find((slot) => slot.path === "cover.webp");
    if (!cover) throw new Error("no cover slot");
    expect(
      (
        await put(
          `/api/library/books/${first.bookId}/files/${cover.fileId}`,
          bookFiles()["cover.webp"] ?? new Uint8Array(),
        )
      ).status,
    ).toBe(200);
    const early = await call(
      `/api/library/books/${first.bookId}/imports/${first.revision}/complete`,
      { method: "POST" },
    );
    expect(early.status).toBe(409);
    const again = await startImport();
    expect(again.status).toBe(200);
    const resumed = await json<LibraryImportResponse>(again);
    expect(resumed.revision).toBe(first.revision);
    expect(resumed.files.find((slot) => slot.path === "cover.webp")?.uploaded).toBe(true);
    expect(resumed.files.find((slot) => slot.path === "chapters/01.md")?.uploaded).toBe(false);
    // 途中の本も棚に出る (読める版はまだ無い)。
    const shelf = await json<LibraryShelfResponse>(await call("/api/library/mine"));
    expect(shelf.entries[0]?.book).toMatchObject({
      status: "importing",
      revision: 0,
      pendingRevision: 1,
    });
  });

  it("updates a book with a new version, reusing unchanged files and purging replaced ones", async () => {
    const { plan } = await importBook();
    const old = db.sqlite
      .prepare(
        "SELECT r2_key FROM library_files WHERE book_id = ? AND kind = 'text' AND content_key LIKE ?",
      )
      .get(plan.bookId, `%-${encoder.encode("# 第2章").length}|%`) as { r2_key: string };
    const changed = bookFiles({ "chapters/02.md": "# 第2章 (改訂)" });
    const started = await json<LibraryImportResponse>(
      await startImport(changed, { ...manifest, title: "改訂版" }),
    );
    expect(started.update).toBe(true);
    expect(started.revision).toBe(2);
    expect(started.files.filter((slot) => !slot.uploaded).map((slot) => slot.path)).toEqual([
      "chapters/02.md",
    ]);
    // 版を切り替えるまでは前の版を読める。
    expect(
      await (await call(`/api/library/books/${plan.bookId}/content/chapters/02.md`)).text(),
    ).toBe("# 第2章");
    await importBook(changed, { ...manifest, title: "改訂版" });
    expect(
      await (await call(`/api/library/books/${plan.bookId}/content/chapters/02.md`)).text(),
    ).toBe("# 第2章 (改訂)");
    const detail = await json<LibraryBookDetail>(await call(`/api/library/books/${plan.bookId}`));
    expect(detail.entry.book).toMatchObject({ title: "改訂版", revision: 2 });
    expect(
      db.sqlite
        .prepare("SELECT count(*) AS n FROM library_r2_purges WHERE prefix = ?")
        .get(old.r2_key),
    ).toEqual({ n: 1 });
    expect(
      db.sqlite
        .prepare("SELECT DISTINCT revision FROM library_revision_files WHERE book_id = ?")
        .all(plan.bookId),
    ).toEqual([{ revision: 2 }]);
  });

  it("sends large files in parts and checks every part's size", async () => {
    const files = bookFiles({ "audio/01.m4a": "0123456789abcdefghijklmnop" }); // 26 bytes > 16
    const started = await json<LibraryImportResponse>(await startImport(files));
    const audio = started.files.find((slot) => slot.kind === "audio");
    expect(audio).toMatchObject({ mode: "multipart", partSize: 8 });
    const base = `/api/library/books/${started.bookId}/files/${audio?.fileId}`;
    expect((await put(base, files["audio/01.m4a"] ?? new Uint8Array())).status).toBe(400);
    const created = await json<{ uploadId: string }>(
      await call(`${base}/multipart`, { method: "POST" }),
    );
    expect(
      (await put(`${base}/multipart/parts/1?uploadId=${created.uploadId}`, encoder.encode("short")))
        .status,
    ).toBe(400);
    expect(
      (await put(`${base}/multipart/parts/1?uploadId=wrong`, encoder.encode("01234567"))).status,
    ).toBe(409);
    await importBook(files);
    const audioBody = await call(`/api/library/books/${started.bookId}/content/audio/01.m4a`);
    expect(await audioBody.text()).toBe("0123456789abcdefghijklmnop");
  });

  it("rejects broken manifests, missing files and size mismatches", async () => {
    const bad = await startImport(bookFiles(), { ...manifest, version: 2, cover: "cover.svg" });
    expect(bad.status).toBe(400);
    const body = await json<{ error: string; details: string[] }>(bad);
    expect(body.details).toEqual(
      expect.arrayContaining([
        "version: この画面が読めるのは 1 だけです",
        "cover: 表紙に使えない形式です (.webp / .jpg / .jpeg / .png)",
      ]),
    );
    const files = bookFiles();
    delete files["chapters/02.md"];
    const missing = await startImport(files);
    expect(missing.status).toBe(400);
    expect((await json<{ error: string }>(missing)).error).toContain(
      "zip に chapters/02.md がありません",
    );
    const started = await json<LibraryImportResponse>(await startImport());
    const slot = started.files[0];
    const wrong = await call(`/api/library/books/${started.bookId}/files/${slot?.fileId}`, {
      method: "PUT",
      body: encoder.encode("xx"),
      headers: { "Content-Length": "2" },
    });
    expect(wrong.status).toBe(400);
  });

  it("verifies the thumbnail checksum", async () => {
    const started = await json<LibraryImportResponse>(await startImport());
    const res = await put(
      `/api/library/books/${started.bookId}/files/${started.thumbnail.fileId}`,
      encoder.encode("jpeg-thumbnaiX"),
    );
    expect(res.status).toBe(400);
  });
});

describe("reading positions", () => {
  it("saves positions, ignores older sends and marks the book finished", async () => {
    const { plan } = await importBook();
    const save = (chapter: string, body: unknown) =>
      call(`/api/library/books/${plan.bookId}/chapters/${chapter}/state`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    expect((await save("ch01", { audioSec: 30, clientUpdatedAt: 2000 })).status).toBe(200);
    const stale = await json<{ state: { audioSec: number } }>(
      await save("ch01", { audioSec: 5, clientUpdatedAt: 1000 }),
    );
    expect(stale.state.audioSec).toBe(30);
    let detail = await json<LibraryBookDetail>(await call(`/api/library/books/${plan.bookId}`));
    expect(detail.entry).toMatchObject({ readingStatus: "reading", lastChapterId: "ch01" });
    await save("ch01", { completed: true, clientUpdatedAt: 3000 });
    await save("ch02", { completed: true, clientUpdatedAt: 3000 });
    detail = await json<LibraryBookDetail>(await call(`/api/library/books/${plan.bookId}`));
    expect(detail.entry).toMatchObject({
      readingStatus: "finished",
      progress: { completedChapters: 2, totalChapters: 2 },
    });
    expect(detail.chapters[0]?.state).toMatchObject({ audioSec: 30, completed: true });
    expect((await save("nope", { completed: true, clientUpdatedAt: 1 })).status).toBe(404);
  });

  it("updates personal shelf fields and filters by them", async () => {
    const { plan } = await importBook();
    const res = await call(`/api/library/shelf/${plan.bookId}`, {
      method: "PUT",
      body: JSON.stringify({ favorite: true, tags: ["設計"] }),
    });
    expect(res.status).toBe(200);
    const favorites = await json<LibraryShelfResponse>(
      await call("/api/library/mine?filter=favorite"),
    );
    expect(favorites.entries[0]).toMatchObject({ favorite: true, tags: ["設計"] });
    expect(
      (await json<LibraryShelfResponse>(await call("/api/library/mine?filter=finished"))).total,
    ).toBe(0);
    expect((await call("/api/library/mine?filter=bogus")).status).toBe(400);
  });
});

describe("deleting and cleanup", () => {
  it("hides a deleted book at once and lets the cron remove its files and rows", async () => {
    const { plan } = await importBook();
    expect(storage.objects.size).toBe(6);
    expect((await call(`/api/library/books/${plan.bookId}`, { method: "DELETE" })).status).toBe(
      202,
    );
    expect((await call(`/api/library/books/${plan.bookId}`)).status).toBe(404);
    expect((await call(`/api/library/books/${plan.bookId}/content/chapters/01.md`)).status).toBe(
      404,
    );
    // 積んだ直後は消さない (送信中のファイルを消さないため)。
    await runLibraryPurge(env, Date.now());
    expect(storage.objects.size).toBe(6);
    await runLibraryPurge(env, Date.now() + PURGE_DELAY_MS + 1000);
    expect(storage.objects.size).toBe(0);
    expect(db.sqlite.prepare("SELECT count(*) AS n FROM library_books").get()).toEqual({ n: 0 });
    expect(db.sqlite.prepare("SELECT count(*) AS n FROM library_r2_purges").get()).toEqual({
      n: 0,
    });
  });

  it("cancelling the first import removes the book", async () => {
    const started = await json<LibraryImportResponse>(await startImport());
    expect(
      (
        await call(`/api/library/books/${started.bookId}/imports/${started.revision}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(200);
    expect((await call(`/api/library/books/${started.bookId}`)).status).toBe(404);
    expect((await json<LibraryShelfResponse>(await call("/api/library/mine"))).total).toBe(0);
  });

  it("leaves unexpected prefixes alone and drops stale imports", async () => {
    storage.objects.set("library/ses/x/keep", new Uint8Array([1]));
    db.sqlite.exec("INSERT INTO library_r2_purges (prefix, created_at) VALUES ('library/ses', 0)");
    const started = await json<LibraryImportResponse>(await startImport());
    const later = Date.now() + 8 * 24 * 60 * 60 * 1000;
    await runLibraryPurge(env, later);
    expect(storage.objects.has("library/ses/x/keep")).toBe(true);
    // 止まったままの最初の取り込みは本ごと削除に回り、次の片付けで行も消える。
    expect(
      db.sqlite.prepare("SELECT status FROM library_books WHERE id = ?").get(started.bookId),
    ).toEqual({ status: "deleting" });
    expect((await json<LibraryShelfResponse>(await call("/api/library/mine"))).total).toBe(0);
    await runLibraryPurge(env, later + PURGE_DELAY_MS + 1000);
    expect(
      db.sqlite.prepare("SELECT status FROM library_books WHERE id = ?").get(started.bookId),
    ).toBeUndefined();
  });
});

describe("parseRange", () => {
  it.each([
    [undefined, null],
    ["bytes=0-3", { start: 0, end: 3 }],
    ["bytes=5-", { start: 5, end: 9 }],
    ["bytes=-3", { start: 7, end: 9 }],
    ["bytes=8-100", { start: 8, end: 9 }],
    ["bytes=10-", "unsatisfiable"],
    ["bytes=0-1,4-5", null],
    ["items=0-1", null],
    ["bytes=5-2", null],
  ])("%s", (header, expected) => {
    expect(parseRange(header, 10)).toEqual(expected);
  });
});
