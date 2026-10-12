import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LibraryCapabilities, LibraryPdf } from "@stella/shared/library/types";
import { LIBRARY_LIMITS } from "@stella/shared/library/types";
import { libraryRoute } from "./library.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "library-pdf-test-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];
let objects: Map<string, Uint8Array>;

/** Enough of R2 for the upload route: streamed put, ranged get, delete. */
function memoryBucket(store: Map<string, Uint8Array>): R2Bucket {
  return {
    async put(key: string, body: ReadableStream) {
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      store.set(key, bytes);
      return { size: bytes.length };
    },
    async get(key: string, options?: { range?: { offset: number; length: number } }) {
      const bytes = store.get(key);
      if (!bytes) return null;
      const range = options?.range;
      const slice = range ? bytes.slice(range.offset, range.offset + range.length) : bytes;
      return { text: async () => new TextDecoder().decode(slice) };
    },
    async delete(key: string) {
      store.delete(key);
    },
  } as unknown as R2Bucket;
}

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('ses','SES',1,1);
    INSERT INTO profiles (id, tenant_id, role, display_name, created_at) VALUES
      ('owner','ses','student','Owner',1), ('other','ses','admin','Other',1);
    INSERT INTO library_books (id, tenant_id, owner_id, title, created_at, updated_at)
      VALUES ('book','ses','owner','Book',1,1);
  `);
  objects = new Map();
  env = {
    DB: db.binding,
    AUTH_JWT_SECRET: SECRET,
    LIBRARY_BUCKET: memoryBucket(objects),
    NARRATOR: {
      capabilities: async () => ({ configured: true, provider: "fake" }),
      startJob: async () => ({ instanceId: "unused" }),
    },
  } as unknown as Env;
  app = mountTestApp(env, libraryRoute).app;
});
afterEach(() => db.sqlite.close());

const token = (user: string) => signAccessToken(SECRET, user, `${user}@example.test`);
const register = async (sizeBytes: number, user = "owner") =>
  request(app, env, "/api/library/books/book/pdfs", {
    token: await token(user),
    method: "POST",
    body: JSON.stringify({ fileName: "part-1.pdf", sizeBytes }),
  });
const upload = async (pdfId: string, bytes: Uint8Array, user = "owner", length = bytes.length) =>
  request(app, env, `/api/library/books/book/pdfs/${pdfId}`, {
    token: await token(user),
    method: "PUT",
    headers: { "Content-Length": String(length), "Content-Type": "application/pdf" },
    body: bytes,
  });
// Larger than the 16KB JSON limit, so the PUT must be exempt from it.
const pdfBytes = (size = 20 * 1024) => {
  const bytes = new Uint8Array(size).fill(32);
  bytes.set(new TextEncoder().encode("%PDF-1.7\n"));
  return bytes;
};
const bookStatus = () =>
  (
    db.sqlite.prepare("SELECT status FROM library_books WHERE id = 'book'").get() as {
      status: string;
    }
  ).status;

describe("PDF upload", () => {
  it("registers PDFs in order, stores the body in R2 and lists them", async () => {
    const bytes = pdfBytes();
    const created = await register(bytes.length);
    expect(created.status).toBe(201);
    const { pdf } = await json<{ pdf: LibraryPdf }>(created);
    expect(pdf).toMatchObject({ position: 1, uploadStatus: "uploading", sizeBytes: bytes.length });
    expect(bookStatus()).toBe("uploading");
    expect((await json<{ pdf: LibraryPdf }>(await register(10))).pdf.position).toBe(2);

    const uploaded = await upload(pdf.id, bytes);
    expect(uploaded.status).toBe(200);
    expect(objects.get(`library/ses/book/pdfs/${pdf.id}.pdf`)).toEqual(bytes);
    const listed = await request(app, env, "/api/library/books/book/pdfs", {
      token: await token("owner"),
    });
    expect((await json<{ pdfs: LibraryPdf[] }>(listed)).pdfs.map((p) => p.uploadStatus)).toEqual([
      "completed",
      "uploading",
    ]);
  });

  it("rejects bodies that are not the registered PDF", async () => {
    const { pdf } = await json<{ pdf: LibraryPdf }>(await register(20 * 1024));
    const notPdf = new Uint8Array(20 * 1024).fill(65);
    expect((await upload(pdf.id, notPdf)).status).toBe(400);
    expect(objects.size).toBe(0);
    expect((await upload(pdf.id, pdfBytes(), "owner", 10)).status).toBe(400);
    expect((await upload(pdf.id, pdfBytes(1024))).status).toBe(400);
  });

  it("keeps other users, closed books and limits out", async () => {
    expect((await register(10, "other")).status).toBe(404);
    const { pdf } = await json<{ pdf: LibraryPdf }>(await register(10));
    expect((await upload(pdf.id, pdfBytes(10), "other")).status).toBe(404);
    expect((await register(LIBRARY_LIMITS.maxPdfBytes + 1)).status).toBe(400);

    db.sqlite.exec("UPDATE library_books SET status = 'processing' WHERE id = 'book'");
    expect((await register(10)).status).toBe(409);
    expect((await upload(pdf.id, pdfBytes(10))).status).toBe(409);
    db.sqlite.exec("UPDATE library_books SET status = 'uploading' WHERE id = 'book'");

    const insert = db.sqlite.prepare(
      "INSERT INTO library_book_pdfs (id, tenant_id, book_id, position, file_name, size_bytes, r2_key, created_at) VALUES (?, 'ses', 'book', ?, 'x.pdf', ?, 'k', 1)",
    );
    for (let n = 2; n <= LIBRARY_LIMITS.maxBookPdfs; n++) insert.run(`p${n}`, n, 10);
    expect((await register(10)).status).toBe(409);
    db.sqlite.prepare("DELETE FROM library_book_pdfs WHERE id <> ?").run(pdf.id);
    insert.run("big", 2, LIBRARY_LIMITS.maxBookBytes - 10);
    expect((await register(1)).status).toBe(409);
  });

  it("offers upload only when processing is configured", async () => {
    const caps = async () =>
      json<LibraryCapabilities>(
        await request(app, env, "/api/library/capabilities", { token: await token("owner") }),
      );
    expect((await caps()).upload).toBe(true);
    env.NARRATOR = {
      capabilities: async () => ({ configured: false, provider: "unconfigured" }),
      startJob: async () => ({ instanceId: "unused" }),
    };
    expect((await caps()).upload).toBe(false);
    expect((await register(10)).status).toBe(403);
  });
});
