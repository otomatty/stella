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
  env = {
    DB: db.binding,
    AUTH_JWT_SECRET: SECRET,
    LIBRARY_BUCKET: {
      delete: async (key: string) => {
        deleted.push(key);
      },
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
  const response = await call("/process", "POST");
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
      "UPDATE library_jobs SET status = 'failed', error_message = 'x'; UPDATE library_books SET status = 'failed'; UPDATE library_job_dispatches SET dispatched_at = 1",
    );
    expect((await startProcessing()).status).toBe(409);
    expect((await call(`/jobs/${job?.id}/retry`, "POST", "other")).status).toBe(404);
    const retried = await call(`/jobs/${job?.id}/retry`, "POST");
    expect(retried.status).toBe(202);
    expect((await json<{ job: LibraryJob }>(retried)).job).toMatchObject({
      status: "queued",
      attempt: 2,
      errorMessage: null,
    });
    expect(row("SELECT instance_id, dispatched_at FROM library_job_dispatches")).toEqual({
      instance_id: `${job?.id}-2`,
      dispatched_at: null,
    });
    expect(row("SELECT status FROM library_books")).toEqual({ status: "processing" });
    expect(started.at(-1)).toMatchObject({ jobId: job?.id, generation: 1 });
    expect((await call(`/jobs/${job?.id}/retry`, "POST")).status).toBe(409);
  });

  it("removes a PDF before processing", async () => {
    expect((await call("/pdfs/pdf", "DELETE", "other")).status).toBe(404);
    expect((await call("/pdfs/pdf", "DELETE")).status).toBe(200);
    expect(deleted).toEqual(["library/ses/book/pdfs/pdf-1.pdf"]);
    expect(row("SELECT count(*) AS n FROM library_book_pdfs")).toEqual({ n: 0 });
    expect((await startProcessing()).status).toBe(409);
  });
});
