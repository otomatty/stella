import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LibraryJob, NarratorJobRequest } from "@stella/shared/library/types";
import { libraryRoute } from "./library.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "library-job-test-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];
let started: NarratorJobRequest[];
let rpcFails: boolean;
let deleted: string[];
let r2Fails: boolean;
let stored: Set<string>;
let onDelete: (() => void) | undefined;

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('ses','SES',1,1);
    INSERT INTO profiles (id, tenant_id, role, display_name, created_at) VALUES
      ('owner','ses','student','Owner',1), ('other','ses','admin','Other',1);
    INSERT INTO library_books (id, tenant_id, owner_id, title, status, created_at, updated_at)
      VALUES ('book','ses','owner','Book','uploading',1,1);
    INSERT INTO library_book_pdfs (id, tenant_id, book_id, position, file_name, size_bytes, r2_key, upload_status, created_at)
      VALUES ('pdf','ses','book',1,'a.pdf',10,'library/ses/book/pdfs/pdf-1.pdf','completed',1);
  `);
  started = [];
  rpcFails = false;
  deleted = [];
  stored = new Set();
  r2Fails = false;
  onDelete = undefined;
  env = {
    DB: db.binding,
    AUTH_JWT_SECRET: SECRET,
    LIBRARY_BUCKET: {
      delete: async (keys: string | string[]) => {
        if (r2Fails) throw new Error("R2 unavailable");
        onDelete?.();
        for (const key of [keys].flat()) {
          deleted.push(key);
          stored.delete(key);
        }
      },
      list: async ({ prefix }: { prefix: string }) => ({
        objects: [...stored].filter((key) => key.startsWith(prefix)).map((key) => ({ key })),
        truncated: false,
      }),
    },
    NARRATOR: {
      capabilities: async () => ({ configured: true, provider: "fake" }),
      startJob: async (p: NarratorJobRequest) => {
        started.push(p);
        if (rpcFails) throw new Error("RPC unavailable");
        return { instanceId: "x" };
      },
    },
  } as unknown as Env;
  app = mountTestApp(env, libraryRoute).app;
});
afterEach(() => db.sqlite.close());

const call = async (path: string, method = "GET", user = "owner") =>
  request(app, env, `/api/library/books/book${path}`, {
    token: await signAccessToken(SECRET, user, `${user}@example.test`),
    method,
  });
const row = (sql: string) => db.sqlite.prepare(sql).get() as Record<string, unknown>;
const startProcessing = async () => {
  const response = await request(app, env, "/api/library/books/book/process", {
    token: await signAccessToken(SECRET, "owner", "owner@example.test"),
    method: "POST",
    body: JSON.stringify({ acknowledgedExternalProcessing: true }),
  });
  return { status: response.status, job: (await json<{ job?: LibraryJob }>(response)).job };
};

describe("book processing jobs", () => {
  it("reserves a job with its dispatch, freezes the PDFs and starts the workflow", async () => {
    const { status, job } = await startProcessing();
    expect(status).toBe(202);
    expect(job).toMatchObject({ type: "ocr", status: "queued", attempt: 1 });
    expect(started).toEqual([{ tenantId: "ses", bookId: "book", jobId: job?.id, generation: 1 }]);
    expect(row("SELECT instance_id FROM library_job_dispatches")).toEqual({
      instance_id: `${job?.id}-1`,
    });
    expect(row("SELECT status FROM library_books")).toEqual({ status: "processing" });
    expect((await startProcessing()).status).toBe(409);
    expect((await call("/pdfs/pdf", "DELETE")).status).toBe(409);
  });

  it("requires the owner to confirm sending the PDFs to the external OCR", async () => {
    expect((await call("/process", "POST")).status).toBe(400);
    expect(row("SELECT count(*) AS n FROM library_jobs")).toEqual({ n: 0 });
    expect(started).toEqual([]);
  });

  it("refuses unfinished uploads, other users and disabled processing", async () => {
    db.sqlite.exec("UPDATE library_book_pdfs SET upload_status = 'uploading'");
    expect((await startProcessing()).status).toBe(409);
    db.sqlite.exec("UPDATE library_book_pdfs SET upload_status = 'completed'");
    expect((await call("/process", "POST", "other")).status).toBe(404);
    expect((await call("/jobs", "GET", "other")).status).toBe(404);
    env.NARRATOR = {
      capabilities: async () => ({ configured: false, provider: "unconfigured" }),
      startJob: async () => ({ instanceId: "x" }),
    };
    expect((await startProcessing()).status).toBe(403);
    expect(row("SELECT count(*) AS n FROM library_jobs")).toEqual({ n: 0 });
  });

  it("keeps the reservation when the RPC fails and re-dispatches it from the jobs poll", async () => {
    rpcFails = true;
    const { status, job } = await startProcessing();
    expect(status).toBe(202);
    expect(started).toHaveLength(1);
    await call("/jobs");
    expect(started).toHaveLength(1); // Too recent to resend.
    db.sqlite.exec("UPDATE library_job_dispatches SET created_at = 0");
    rpcFails = false;
    const jobs = await json<{ jobs: LibraryJob[] }>(await call("/jobs"));
    expect(jobs.jobs.map((j) => j.id)).toEqual([job?.id]);
    expect(started).toHaveLength(2);
    db.sqlite.exec("UPDATE library_job_dispatches SET dispatched_at = 1");
    await call("/jobs");
    expect(started).toHaveLength(2);
  });

  it("retries a failed job as a new attempt only once", async () => {
    const { job } = await startProcessing();
    expect((await call(`/jobs/${job?.id}/retry`, "POST")).status).toBe(409);
    db.sqlite.exec(
      "UPDATE library_jobs SET status = 'failed', error_message = 'x', progress_current = 4, progress_total = 9; UPDATE library_books SET status = 'failed'; UPDATE library_job_dispatches SET dispatched_at = 1",
    );
    expect((await startProcessing()).status).toBe(409);
    expect((await call(`/jobs/${job?.id}/retry`, "POST", "other")).status).toBe(404);
    const retried = await call(`/jobs/${job?.id}/retry`, "POST");
    expect(retried.status).toBe(202);
    expect((await json<{ job: LibraryJob }>(retried)).job).toMatchObject({
      status: "queued",
      attempt: 2,
      errorMessage: null,
      progressCurrent: 0,
      progressTotal: null,
    });
    expect(row("SELECT instance_id, dispatched_at FROM library_job_dispatches")).toEqual({
      instance_id: `${job?.id}-2`,
      dispatched_at: null,
    });
    expect(row("SELECT status FROM library_books")).toEqual({ status: "processing" });
    expect(started.at(-1)).toMatchObject({ jobId: job?.id, generation: 1 });
    expect((await call(`/jobs/${job?.id}/retry`, "POST")).status).toBe(409);
  });

  it("deletes a whole split original even when a part is re-sent during the delete", async () => {
    db.sqlite.exec(`
      UPDATE library_book_pdfs SET part_group = 'g-1';
      INSERT INTO library_book_pdfs (id, tenant_id, book_id, position, file_name, size_bytes, r2_key, upload_status, part_group, created_at)
        VALUES ('pdf2','ses','book',2,'b_02.pdf',10,'library/ses/book/pdfs/pdf2-1.pdf','completed','g-1',1);
    `);
    // The PUT of part 2 started before the delete and now tries its compare-and-swap.
    let swapped = -1;
    onDelete = () => {
      swapped = Number(
        db.sqlite
          .prepare(
            "UPDATE library_book_pdfs SET r2_key = 'library/ses/book/pdfs/pdf2-2.pdf', upload_status = 'completed' WHERE id = 'pdf2' AND r2_key = 'library/ses/book/pdfs/pdf2-1.pdf'",
          )
          .run().changes,
      );
    };
    expect((await call("/pdfs/pdf", "DELETE")).status).toBe(200);
    expect(swapped).toBe(0); // the delete's mark already changed the key
    expect(row("SELECT count(*) AS n FROM library_book_pdfs")).toEqual({ n: 0 });
    expect(deleted.sort()).toEqual([
      "library/ses/book/pdfs/pdf-1.pdf",
      "library/ses/book/pdfs/pdf2-1.pdf",
    ]);
  });

  it("refuses to send a PDF that is being deleted", async () => {
    db.sqlite.exec(
      "UPDATE library_book_pdfs SET upload_status = 'uploading', r2_key = r2_key || '#deleting'",
    );
    const sent = await request(app, env, "/api/library/books/book/pdfs/pdf", {
      token: await signAccessToken(SECRET, "owner", "owner@example.test"),
      method: "PUT",
      headers: { "Content-Length": "10", "Content-Type": "application/pdf" },
      body: new Uint8Array(10),
    });
    expect(sent.status).toBe(404);
    expect((await startProcessing()).status).toBe(409);
  });

  it("treats a repeated registration with the same client id as the same PDF", async () => {
    const id = "0b9f1a3c-6d2e-4f5a-8b7c-9d0e1f2a3b4c";
    const register = async (pdfId: string) =>
      request(app, env, "/api/library/books/book/pdfs", {
        token: await signAccessToken(SECRET, "owner", "owner@example.test"),
        method: "POST",
        body: JSON.stringify({ id: pdfId, fileName: "b.pdf", sizeBytes: 20 }),
      });
    expect((await register(id)).status).toBe(201);
    const again = await register(id.toUpperCase());
    expect(again.status).toBe(200);
    expect((await json<{ pdf: { id: string; position: number } }>(again)).pdf).toMatchObject({
      id,
      position: 2,
    });
    expect(row("SELECT count(*) AS n FROM library_book_pdfs")).toEqual({ n: 2 });
    expect((await register("not-a-uuid")).status).toBe(400);
    db.sqlite.exec(
      "INSERT INTO library_books (id, tenant_id, owner_id, title, created_at, updated_at) VALUES ('book2','ses','owner','Other',1,1)",
    );
    const elsewhere = await request(app, env, "/api/library/books/book2/pdfs", {
      token: await signAccessToken(SECRET, "owner", "owner@example.test"),
      method: "POST",
      body: JSON.stringify({ id, fileName: "b.pdf", sizeBytes: 20 }),
    });
    expect(elsewhere.status).toBe(409);
  });

  it("reopens a failed book when its PDFs change, under a new generation", async () => {
    const { job } = await startProcessing();
    db.sqlite.exec(`
      UPDATE library_jobs SET status = 'failed';
      UPDATE library_books SET status = 'failed', page_count = 1100;
      UPDATE library_book_pdfs SET page_count = 60;
      INSERT INTO library_pages (tenant_id, book_id, page_no, ocr_status) VALUES ('ses','book',1,'succeeded');
      INSERT INTO library_chapters (id, tenant_id, book_id, position, title, start_page, end_page, updated_at)
        VALUES ('c1','ses','book',1,'Old',1,1,1);
    `);
    for (const key of [
      "library/ses/book/g1/outputs/run/pages/1.webp",
      "library/ses/book/g1/chapters/run.json",
      "library/ses/book/pdfs/keep.pdf",
    ])
      stored.add(key);
    // Nothing to delete: the failed book and its partial results stay as they are.
    expect((await call("/pdfs/missing", "DELETE")).status).toBe(404);
    expect(row("SELECT status, generation FROM library_books")).toEqual({
      status: "failed",
      generation: 1,
    });
    expect(row("SELECT count(*) AS n FROM library_pages")).toEqual({ n: 1 });
    expect((await call("/pdfs/pdf", "DELETE")).status).toBe(200);
    // The retired generation's objects go; the originals stay.
    expect([...stored]).toEqual(["library/ses/book/pdfs/keep.pdf"]);
    expect(row("SELECT status, generation, page_count FROM library_books")).toEqual({
      status: "uploading",
      generation: 2,
      page_count: null,
    });
    expect(row("SELECT count(*) AS n FROM library_pages")).toEqual({ n: 0 });
    expect(row("SELECT count(*) AS n FROM library_chapters")).toEqual({ n: 0 });
    // The old run's job can no longer be retried; a new run starts on generation 2.
    expect((await call(`/jobs/${job?.id}/retry`, "POST")).status).toBe(409);
    db.sqlite.exec(`
      INSERT INTO library_book_pdfs (id, tenant_id, book_id, position, file_name, size_bytes, r2_key, upload_status, page_count, created_at)
        VALUES ('pdf2','ses','book',2,'b.pdf',10,'library/ses/book/pdfs/pdf2-1.pdf','completed',60,1);
    `);
    expect((await startProcessing()).status).toBe(202);
    expect(started.at(-1)).toMatchObject({ generation: 2 });
  });

  it("deletes every part split from the same original together", async () => {
    db.sqlite.exec(`
      UPDATE library_book_pdfs SET part_group = 'g-1', source_file_name = 'book.pdf';
      INSERT INTO library_book_pdfs (id, tenant_id, book_id, position, file_name, size_bytes, r2_key, upload_status, part_group, source_file_name, created_at)
        VALUES ('pdf2','ses','book',2,'book_02.pdf',10,'library/ses/book/pdfs/pdf2-1.pdf','completed','g-1','book.pdf',1),
               ('other','ses','book',3,'notes.pdf',10,'library/ses/book/pdfs/other-1.pdf','completed',NULL,NULL,1);
    `);
    const listed = await json<{ pdfs: { id: string; sourceFileName: string | null }[] }>(
      await call("/pdfs"),
    );
    expect(listed.pdfs.map((pdf) => [pdf.id, pdf.sourceFileName])).toEqual([
      ["pdf", "book.pdf"],
      ["pdf2", "book.pdf"],
      ["other", null],
    ]);
    expect((await call("/pdfs/pdf2", "DELETE")).status).toBe(200);
    expect(deleted.sort()).toEqual([
      "library/ses/book/pdfs/pdf-1.pdf",
      "library/ses/book/pdfs/pdf2-1.pdf",
    ]);
    expect(db.sqlite.prepare("SELECT id FROM library_book_pdfs").all()).toEqual([{ id: "other" }]);
  });

  it("lists chapter titles and page ranges to the owner only", async () => {
    db.sqlite.exec(`
      INSERT INTO library_chapters (id, tenant_id, book_id, position, title, markdown, start_page, end_page, updated_at)
      VALUES ('c2','ses','book',2,'Second','body two',4,9,1), ('c1','ses','book',1,'First','body one',1,3,1);
    `);
    expect((await call("/chapters", "GET", "other")).status).toBe(404);
    const body = await json<{ chapters: unknown[] }>(await call("/chapters"));
    expect(body.chapters).toEqual([
      { id: "c1", position: 1, title: "First", startPage: 1, endPage: 3 },
      { id: "c2", position: 2, title: "Second", startPage: 4, endPage: 9 },
    ]);
    expect(JSON.stringify(body)).not.toContain("body one");
  });

  it("removes a PDF before processing", async () => {
    expect((await call("/pdfs/pdf", "DELETE", "other")).status).toBe(404);
    r2Fails = true;
    expect((await call("/pdfs/pdf", "DELETE")).status).toBe(500);
    // The row survives the failed R2 delete, unfinished so processing cannot start on it.
    expect(row("SELECT upload_status FROM library_book_pdfs")).toEqual({
      upload_status: "uploading",
    });
    expect((await startProcessing()).status).toBe(409);
    r2Fails = false;
    expect((await call("/pdfs/pdf", "DELETE")).status).toBe(200);
    expect(deleted).toEqual(["library/ses/book/pdfs/pdf-1.pdf"]);
    expect(row("SELECT count(*) AS n FROM library_book_pdfs")).toEqual({ n: 0 });
    expect((await startProcessing()).status).toBe(409);
  });
});
