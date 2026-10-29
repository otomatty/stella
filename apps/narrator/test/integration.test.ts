import { PDFDocument } from "pdf-lib";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Miniflare, convertV4MiniflareOptions, type V4ModuleDefinition } from "miniflare";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { signAccessToken } from "../../api/src/lib/auth-jwt.js";
import { speechHash } from "@stella/book-core/speech";
import type { NarratorJobRequest, LibraryShelfResponse } from "@stella/shared/library/types";
import { DEFAULT_OCR_PAGES_PER_USER_MONTH, quotaMonth } from "../src/quota";
const base = resolve(import.meta.dirname, "..");
const secret = "library-integration-test-secret";
let mf: Miniflare;
let db: Awaited<ReturnType<Miniflare["getD1Database"]>>;
let bucket: Awaited<ReturnType<Miniflare["getR2Bucket"]>>;
const tokens = new Map<string, string>();
async function request(
  path: string,
  user = "owner",
  method = "GET",
  body?: unknown,
): Promise<Awaited<ReturnType<Miniflare["dispatchFetch"]>>> {
  const response = await mf.dispatchFetch(`http://localhost/api/library/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens.get(user) ?? "invalid"}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return response;
}
async function data<T>(response: { json(): Promise<unknown> }): Promise<T> {
  return (await response.json()) as T;
}
async function createBook(title = "Personal book"): Promise<string> {
  const response = await request("books", "owner", "POST", { title });
  expect(response.status).toBe(201);
  return (await data<{ book: { id: string } }>(response)).book.id;
}
async function reserve(p: NarratorJobRequest) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO library_job_dispatches (tenant_id,book_id,job_id,instance_id,created_at) SELECT tenant_id,book_id,id,id || '-' || attempt,1 FROM library_jobs WHERE tenant_id = ? AND book_id = ? AND id = ? AND generation = ?",
    )
    .bind(p.tenantId, p.bookId, p.jobId, p.generation)
    .run();
}
async function dispatch(p: NarratorJobRequest, reserved = true) {
  if (reserved) await reserve(p);
  const response = await mf.dispatchFetch("http://localhost/p0/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!response.ok) throw new Error("Dispatch refused");
  return (await response.json()) as { instanceId: string };
}
async function waitJob(id: string, polls = 600): Promise<void> {
  let readFailures = 0;
  for (let n = 0; n < polls; n++) {
    let row: { status: string } | null;
    try {
      row = await db
        .prepare("SELECT status FROM library_jobs WHERE id = ?")
        .bind(id)
        .first<{ status: string }>();
      readFailures = 0;
    } catch (error) {
      // Miniflare's Node RPC bridge can reset a reused HTTP connection while
      // a CPU-heavy step runs. Retry the read, never the processing operation.
      if (!(error instanceof TypeError) || error.message !== "fetch failed" || ++readFailures >= 3)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    if (row?.status === "succeeded") return;
    if (row?.status === "failed") throw new Error(`Job failed: ${id}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Job timed out: ${id}`);
}
beforeAll(async () => {
  await build({
    entryPoints: [resolve(base, "test/fixtures/api.ts")],
    outfile: resolve(base, "dist/api-test.mjs"),
    bundle: true,
    platform: "neutral",
    format: "esm",
    conditions: ["workerd", "worker", "browser"],
    // node:* comes from nodejs_compat at runtime (the API's auth library imports node:crypto).
    external: ["cloudflare:*", "node:*"],
    target: "es2022",
  });
  const modules: V4ModuleDefinition[] = [
    { type: "ESModule", path: resolve(base, "dist/index.js") },
    ...readdirSync(resolve(base, "dist"))
      .filter((name) => name.endsWith(".wasm"))
      .map((name) => ({ type: "CompiledWasm" as const, path: resolve(base, "dist", name) })),
  ];
  mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "api-test",
          modules: true,
          scriptPath: resolve(base, "dist/api-test.mjs"),
          compatibilityDate: "2026-10-11",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: { DB: "library-test" },
          r2Buckets: { LIBRARY_BUCKET: "library-test" },
          serviceBindings: { NARRATOR: { name: "narrator", entrypoint: "Narrator" } },
          bindings: {
            AUTH_JWT_SECRET: secret,
            ALLOWED_ORIGINS: "http://localhost",
            ANTHROPIC_API_KEY: "",
            TTS_LANGUAGE: "en-US",
          },
        },
        {
          name: "narrator",
          modules,
          compatibilityDate: "2026-10-11",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: { DB: "library-test" },
          r2Buckets: { BUCKET: "library-test" },
          workflows: {
            BOOK_WORKFLOW: { name: "book-test", className: "BookWorkflow" },
            AUDIO_WORKFLOW: { name: "audio-test", className: "AudioWorkflow" },
          },
          bindings: {
            LIBRARY_PROCESSING_ENABLED: "1",
            FAKE_PROVIDERS: "1",
            OCR_MODEL: "fake-ocr",
            TTS_MODEL: "fake-tts",
            TTS_VOICE: "Kore",
            TTS_LANGUAGE: "en-US",
          },
        },
      ],
    }),
  );
  await mf.ready;
  db = await mf.getD1Database("DB", "api-test");
  bucket = await mf.getR2Bucket("BUCKET", "narrator");
  const dir = resolve(base, "../api/drizzle");
  for (const name of readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    for (const sql of readFileSync(resolve(dir, name), "utf8").split("--> statement-breakpoint"))
      if (sql.trim()) await db.prepare(sql).run();
  }
  await db
    .prepare(
      "INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('a','A',1,1),('b','B',1,1)",
    )
    .run();
  for (const [id, role, tenant, disabled] of [
    ["owner", "student", "a", 0],
    ["other", "student", "a", 0],
    ["outsider", "student", "b", 0],
    ["instructor", "instructor", "a", 0],
    ["admin", "admin", "a", 0],
    ["platform-admin", "platform_admin", "a", 0],
    ["sales", "sales", "a", 0],
    ["disabled", "student", "a", 1],
  ] as const) {
    await db
      .prepare(
        "INSERT INTO profiles (id,tenant_id,role,display_name,disabled,created_at) VALUES (?,?,?,?,?,1)",
      )
      .bind(id, tenant, role, id, disabled)
      .run();
    tokens.set(id, await signAccessToken(secret, id, `${id}@example.test`));
  }
});
afterAll(async () => {
  await mf?.dispose();
});
describe("JWT-authenticated personal library", () => {
  it("requires an active STELLA profile", async () => {
    expect((await request("mine", "missing")).status).toBe(401);
    expect((await request("mine", "disabled")).status).toBe(403);
    expect((await mf.dispatchFetch("http://localhost/api/library/mine")).status).toBe(401);
  });
  it("creates a private book and isolated shelf, with server-selected ownership", async () => {
    expect(
      (await request("books", "owner", "POST", { title: "wrong", ownerId: "other" })).status,
    ).toBe(400);
    expect(
      (await request("books", "owner", "POST", { title: "wrong", tenantId: "b" })).status,
    ).toBe(400);
    expect(
      (await request("books", "owner", "POST", { title: "wrong", visibility: "company" })).status,
    ).toBe(400);
    const id = await createBook();
    for (const user of ["other", "outsider", "instructor", "admin", "platform-admin", "sales"]) {
      expect((await request(`books/${id}`, user)).status).toBe(404);
      expect((await request(`books/${id}`, user, "PATCH", { title: "stolen" })).status).toBe(404);
      expect((await request(`shelf/${id}`, user, "PUT", { favorite: true })).status).toBe(404);
      expect((await request(`books/${id}`, user, "DELETE")).status).toBe(404);
      expect((await data<LibraryShelfResponse>(await request("mine", user))).total).toBe(0);
    }
    expect((await request(`books/${id}`, "owner", "PATCH", { author: "Author" })).status).toBe(200);
    expect(
      (
        await request(`shelf/${id}`, "owner", "PUT", {
          readingStatus: "reading",
          favorite: true,
          tags: [" SQL ", "SQL"],
        })
      ).status,
    ).toBe(200);
    const shelf = await data<LibraryShelfResponse>(await request("mine"));
    expect(shelf.entries.find((entry) => entry.book.id === id)).toMatchObject({
      readingStatus: "reading",
      favorite: true,
      tags: ["SQL"],
      book: { author: "Author" },
    });
    expect(JSON.stringify(shelf)).not.toMatch(/owner_id|tenant_id|r2_key|markdown/);
    expect((await request(`shelf/${id}`, "owner", "PUT", { readingStatus: "bad" })).status).toBe(
      400,
    );
    expect((await request("mine?limit=0")).status).toBe(400);
    expect((await request(`shelf/${id}`, "owner", "DELETE")).status).toBe(200);
    expect((await request(`books/${id}`)).status).toBe(200);
    expect((await request(`shelf/${id}`, "owner", "PUT", { favorite: false })).status).toBe(200);
    expect((await request(`books/${id}`, "owner", "DELETE")).status).toBe(202);
    expect((await request(`books/${id}`)).status).toBe(404);
    expect(
      (
        await db
          .prepare("SELECT count(*) AS count FROM library_r2_deletions WHERE book_id = ?")
          .bind(id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
  it("allows each staff role to own a private shelf without granting private reads", async () => {
    for (const user of ["instructor", "admin", "platform-admin", "sales"]) {
      expect((await request("books", user, "POST", { title: `${user}'s book` })).status).toBe(201);
      expect((await data<LibraryShelfResponse>(await request("mine", user))).total).toBe(1);
    }
  });
});
describe("internal processing foundation", () => {
  it("retains a paid checkpoint after a transient post-put guard failure", async () => {
    const id = await createBook("Transient guard failure");
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?,'a',?,1,'ocr','owner',1)",
      )
      .bind(p.jobId, id)
      .run();
    await reserve(p);
    const response = await mf.dispatchFetch("http://localhost/p0/transient-put", {
      method: "POST",
      body: JSON.stringify(p),
    });
    expect(await response.json()).toMatchObject({
      failed: true,
      retained: true,
      calls: 1,
      readsBeforePut: 0,
    });
  });
  it("forwards the configured Worker language into synthesis settings", async () => {
    const response = await mf.dispatchFetch("http://localhost/p0/tts-settings");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ language: "en-US" });
  });
  it("reads the winning chapter plan and persisted prefix from one snapshot", async () => {
    const id = await createBook("Chapter plan race");
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    const response = await mf.dispatchFetch("http://localhost/p0/chapter-state-race", {
      method: "POST",
      body: JSON.stringify(p),
    });
    const result = await data<{
      before: { chapter_plan_key: string | null; chapter_count: number };
      after: { chapter_plan_key: string; chapter_count: number };
      reads: number;
      winner: string;
    }>(response);
    expect(result.before).toMatchObject({ chapter_plan_key: null, chapter_count: 0 });
    expect(result.after).toMatchObject({ chapter_plan_key: result.winner, chapter_count: 1 });
    expect(result.reads).toBe(1);
  });
  it("preserves a replacement page when an obsolete put loses authority", async () => {
    const id = await createBook("Replacement put");
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?,'a',?,1,'ocr','owner',1)",
      )
      .bind(p.jobId, id)
      .run();
    await reserve(p);
    const response = await mf.dispatchFetch("http://localhost/p0/put-replacement", {
      method: "POST",
      body: JSON.stringify(p),
    });
    const result = await data<{ oldKey: string; newKey: string; rejected: boolean }>(response);
    expect(result.rejected).toBe(true);
    expect(await bucket.get(result.oldKey)).toBeNull();
    expect(await (await bucket.get(result.newKey))?.text()).toBe("replacement");
  });
  it("resumes a checkpointed OCR response after a downstream D1 failure", async () => {
    const id = await createBook("OCR checkpoint");
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?,'a',?,1,'ocr','owner',1)",
      )
      .bind(p.jobId, id)
      .run();
    await reserve(p);
    const response = await mf.dispatchFetch("http://localhost/p0/ocr-checkpoint", {
      method: "POST",
      body: JSON.stringify(p),
    });
    expect(await response.json()).toEqual({ calls: 1, writeFailed: true, sameReference: true });
    expect(
      await db
        .prepare(
          "SELECT count(*) AS count,sum(quantity) AS quantity FROM library_job_usages WHERE job_id = ? AND unit = 'input_token'",
        )
        .bind(p.jobId)
        .first(),
    ).toMatchObject({ count: 1, quantity: 258 });
  });
  it("requires the reserved attempt and collects a put that races deletion", async () => {
    const id = await createBook("Deletion race");
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?,'a',?,1,'split','owner',1)",
      )
      .bind(p.jobId, id)
      .run();
    await expect(dispatch(p, false)).rejects.toThrow();
    await reserve(p);
    await db
      .prepare("UPDATE library_job_dispatches SET instance_id = ? WHERE job_id = ?")
      .bind(`${p.jobId}-2`, p.jobId)
      .run();
    await expect(dispatch(p, false)).rejects.toThrow();
    await db
      .prepare("UPDATE library_job_dispatches SET instance_id = ? WHERE job_id = ?")
      .bind(`${p.jobId}-1`, p.jobId)
      .run();
    const stale = await mf.dispatchFetch("http://localhost/p0/stale-attempt", {
      method: "POST",
      body: JSON.stringify(p),
    });
    expect(await stale.json()).toMatchObject({ status: "queued", completionRejected: true });
    expect(
      await db.prepare("SELECT status FROM library_books WHERE id = ?").bind(id).first(),
    ).toMatchObject({ status: "draft" });
    const response = await mf.dispatchFetch("http://localhost/p0/put-race", {
      method: "POST",
      body: JSON.stringify(p),
    });
    expect(response.status).toBe(400);
    expect(await bucket.get(`library/a/${id}/g1/late.bin`)).toBeNull();
    expect(
      await db
        .prepare("SELECT prefix FROM library_r2_deletions WHERE book_id = ?")
        .bind(id)
        .first(),
    ).not.toBeNull();
  });
  it("marks a disabled owner's interrupted book failed while protecting deleted generations", async () => {
    const id = await createBook("Interrupted book");
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,status,created_at) VALUES (?,'a',?,1,'split','owner','running',1)",
      )
      .bind(p.jobId, id)
      .run();
    await reserve(p);
    await db.prepare("UPDATE library_books SET status = 'processing' WHERE id = ?").bind(id).run();
    await db.prepare("UPDATE profiles SET disabled = 1 WHERE id = 'owner'").run();
    try {
      const response = await mf.dispatchFetch("http://localhost/p0/fail-book", {
        method: "POST",
        body: JSON.stringify(p),
      });
      expect(response.status).toBe(200);
      expect(
        await db.prepare("SELECT status FROM library_jobs WHERE id = ?").bind(p.jobId).first(),
      ).toMatchObject({ status: "failed" });
      expect(
        await db.prepare("SELECT status FROM library_books WHERE id = ?").bind(id).first(),
      ).toMatchObject({ status: "failed" });
      await db
        .prepare("UPDATE library_books SET status = 'deleting', generation = 2 WHERE id = ?")
        .bind(id)
        .run();
      await mf.dispatchFetch("http://localhost/p0/fail-book", {
        method: "POST",
        body: JSON.stringify(p),
      });
      expect(
        await db
          .prepare("SELECT status,generation FROM library_books WHERE id = ?")
          .bind(id)
          .first(),
      ).toMatchObject({ status: "deleting", generation: 2 });
    } finally {
      await db.prepare("UPDATE profiles SET disabled = 0 WHERE id = 'owner'").run();
    }
  });
  it("keeps a successful book ready when a sibling job starts later and fails", async () => {
    const id = await createBook("Sibling completion");
    const successful = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    const slower = { ...successful, jobId: crypto.randomUUID() };
    for (const [p, type] of [
      [successful, "split"],
      [slower, "ocr"],
    ] as const) {
      await db
        .prepare(
          "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,status,created_at) VALUES (?,'a',?,1,?,'owner','running',1)",
        )
        .bind(p.jobId, id, type)
        .run();
      await reserve(p);
    }
    await db.prepare("UPDATE library_books SET status = 'processing' WHERE id = ?").bind(id).run();
    const response = await mf.dispatchFetch("http://localhost/p0/finish", {
      method: "POST",
      body: JSON.stringify({ p: successful, book: true }),
    });
    expect(await response.json()).toEqual({ rejected: false });
    await dispatch(slower);
    await expect(waitJob(slower.jobId)).rejects.toThrow("Job failed");
    expect(
      await db
        .prepare("SELECT status FROM library_jobs WHERE id = ?")
        .bind(successful.jobId)
        .first(),
    ).toMatchObject({ status: "succeeded" });
    expect(
      await db.prepare("SELECT status FROM library_books WHERE id = ?").bind(id).first(),
    ).toMatchObject({ status: "ready" });
  });
  it("rejects job and book completion when authority changes after the final guard", async () => {
    for (const book of [true, false])
      for (const revoke of ["disabled", "superseded"] as const) {
        const id = await createBook("Completion race");
        const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
        await db
          .prepare(
            "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,status,created_at) VALUES (?,'a',?,1,'split','owner','running',1)",
          )
          .bind(p.jobId, id)
          .run();
        await reserve(p);
        await db
          .prepare("UPDATE library_books SET status = ? WHERE id = ?")
          .bind(book ? "processing" : "ready", id)
          .run();
        try {
          const response = await mf.dispatchFetch("http://localhost/p0/finish", {
            method: "POST",
            body: JSON.stringify({ p, revoke, book }),
          });
          expect(await response.json()).toEqual({ rejected: true });
          expect(
            await db.prepare("SELECT status FROM library_jobs WHERE id = ?").bind(p.jobId).first(),
          ).toMatchObject({ status: revoke === "disabled" ? "failed" : "queued" });
          expect(
            await db.prepare("SELECT status FROM library_books WHERE id = ?").bind(id).first(),
          ).toMatchObject({
            status: book ? (revoke === "disabled" ? "failed" : "processing") : "ready",
          });
        } finally {
          await db.prepare("UPDATE profiles SET disabled = 0 WHERE id = 'owner'").run();
        }
      }
  });
  it("cancels an unconsumed audio stream when the put guard rejects", async () => {
    const id = await createBook("Stream cancellation");
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,status,created_at) VALUES (?,'a',?,1,'split','owner','running',1)",
      )
      .bind(p.jobId, id)
      .run();
    await reserve(p);
    try {
      const response = await mf.dispatchFetch("http://localhost/p0/stream-race", {
        method: "POST",
        body: JSON.stringify(p),
        signal: AbortSignal.timeout(5000),
      });
      expect(await response.json()).toEqual({ rejected: true });
      expect(
        await db.prepare("SELECT status FROM library_jobs WHERE id = ?").bind(p.jobId).first(),
      ).toMatchObject({ status: "failed" });
      expect(await bucket.get(`library/a/${id}/g1/stream.mp3`)).toBeNull();
    } finally {
      await db.prepare("UPDATE profiles SET disabled = 0 WHERE id = 'owner'").run();
    }
  });
  it("cleans new deletions ahead of historical tombstones and backs off rechecks", async () => {
    const day = 24 * 60 * 60 * 1000,
      now = Date.now();
    await db
      .prepare(
        "WITH RECURSIVE rows(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM rows WHERE n<500) INSERT INTO library_r2_deletions (prefix,tenant_id,book_id,created_at,not_before) SELECT 'library/a/retired-' || n || '/', 'a', 'retired-' || n, ?, 0 FROM rows",
      )
      .bind(now - 31 * day)
      .run();
    const id = await createBook("Priority cleanup");
    const key = `library/a/${id}/original.pdf`;
    await bucket.put(key, new Uint8Array([1]));
    await request(`books/${id}`, "owner", "DELETE");
    await db
      .prepare("UPDATE library_r2_deletions SET not_before = ? WHERE book_id = ?")
      .bind(now - 1, id)
      .run();
    try {
      await mf.dispatchFetch("http://localhost/p0/cleanup", { method: "POST" });
      expect(await bucket.get(key)).toBeNull();
      expect(
        await db.prepare("SELECT id FROM library_books WHERE id = ?").bind(id).first(),
      ).toBeNull();
      const marker = await db
        .prepare("SELECT not_before FROM library_r2_deletions WHERE book_id = 'retired-1'")
        .first<{ not_before: number }>();
      expect(marker?.not_before).toBeGreaterThan(now + 29 * day);
    } finally {
      await db.prepare("DELETE FROM library_r2_deletions WHERE book_id LIKE 'retired-%'").run();
    }
  });
  it("resumes completed chunks after a batch fails and concatenates bounded groups", async () => {
    const id = await createBook("Batched audio");
    const chapterId = crypto.randomUUID();
    const markdown = "a".repeat(300 * 201);
    const hash = await speechHash(markdown);
    await db
      .prepare(
        "INSERT INTO library_chapters (id,tenant_id,book_id,position,title,markdown,speech_hash,start_page,end_page,updated_at) VALUES (?,'a',?,1,'Audio',?,?,1,1,1)",
      )
      .bind(chapterId, id, markdown, hash)
      .run();
    await db
      .prepare(
        "INSERT INTO library_chapter_revisions (id,tenant_id,book_id,chapter_id,revision,markdown,speech_hash,created_at) VALUES (?,'a',?,?,1,?,?,1)",
      )
      .bind(crypto.randomUUID(), id, chapterId, markdown, hash)
      .run();
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,chapter_id,generation,type,created_by,created_at) VALUES (?,'a',?,?,1,'tts','owner',1)",
      )
      .bind(p.jobId, id, chapterId)
      .run();
    await bucket.put("_fake/tts-fast.json", "{}");
    await bucket.put("_fake/tts-fail.json", JSON.stringify({ remaining: 1, after: 2 }));
    try {
      await dispatch(p);
      await waitJob(p.jobId, 1800);
    } finally {
      await bucket.delete("_fake/tts-fast.json");
      await bucket.delete("_fake/tts-fail.json");
    }
    expect(
      await db
        .prepare("SELECT status,progress_current,progress_total FROM library_jobs WHERE id = ?")
        .bind(p.jobId)
        .first(),
    ).toMatchObject({ status: "succeeded", progress_current: 201, progress_total: 201 });
    expect(
      await db
        .prepare(
          "SELECT count(*) AS count,sum(quantity) AS quantity FROM library_job_usages WHERE job_id = ? AND unit = 'input_token'",
        )
        .bind(p.jobId)
        .first(),
    ).toMatchObject({ count: 201, quantity: 300 * 201 });
    const audio = await db
      .prepare("SELECT status,r2_key,size_bytes FROM library_audios WHERE book_id = ?")
      .bind(id)
      .first<{ status: string; r2_key: string; size_bytes: number }>();
    expect(audio?.status).toBe("ready");
    expect((await bucket.get(audio?.r2_key ?? ""))?.size).toBe(audio?.size_bytes);
    const prefix = `library/a/${id}/g1/audio/tmp/`;
    // Job success is persisted before the following Workflow cleanup step.
    for (let n = 0; n < 100; n++) {
      if (!(await bucket.list({ prefix })).objects.length) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect((await bucket.list({ prefix })).objects).toHaveLength(0);
  }, 240000);
  it("saves a dense figure page across batches and completes every illustrated page", async () => {
    const id = await createBook("Illustrated book");
    const pdf = await PDFDocument.create();
    for (let n = 0; n < 7; n++) pdf.addPage([200, 300]);
    const bytes = await pdf.save(),
      key = `library/a/${id}/pdf/source.pdf`;
    await bucket.put(key, bytes);
    await db
      .prepare(
        "INSERT INTO library_book_pdfs (id,tenant_id,book_id,position,file_name,size_bytes,r2_key,upload_status,page_count,created_at) VALUES (?,'a',?,1,'illustrated.pdf',?,?,'completed',7,1)",
      )
      .bind(crypto.randomUUID(), id, bytes.length, key)
      .run();
    for (let n = 1; n <= 7; n++) {
      const figures = Array.from({ length: n === 1 ? 12 : 1 }, (_, index) => ({
        fileName: `p${n}-${index + 1}.webp`,
        box: [100, 100, 200, 200],
        caption: "Figure",
      }));
      await db
        .prepare(
          "INSERT INTO library_pages (tenant_id,book_id,page_no,ocr_status,ocr_markdown,ocr_figures) VALUES ('a',?,?,'succeeded',?,?)",
        )
        .bind(id, n, `# Page ${n}\n\nText.`, JSON.stringify(figures))
        .run();
    }
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?,'a',?,1,'ocr','owner',1)",
      )
      .bind(p.jobId, id)
      .run();
    await dispatch(p);
    await waitJob(p.jobId);
    expect(
      await db
        .prepare("SELECT count(*) AS count FROM library_figures WHERE book_id = ?")
        .bind(id)
        .first(),
    ).toMatchObject({ count: 18 });
    expect(
      await db
        .prepare(
          "SELECT count(*) AS count FROM library_pages WHERE book_id = ? AND image_r2_key IS NOT NULL",
        )
        .bind(id)
        .first(),
    ).toMatchObject({ count: 7 });
    expect(
      await db.prepare("SELECT status FROM library_books WHERE id = ?").bind(id).first(),
    ).toMatchObject({ status: "ready" });
  });
  it("numbers and saves a 1000-page book across bounded Workflow steps", async () => {
    const id = await createBook("Large book");
    const pdf = await PDFDocument.create();
    for (let n = 0; n < 100; n++) pdf.addPage([200, 300]);
    const bytes = await pdf.save(),
      key = `library/a/${id}/pdf/source.pdf`;
    await bucket.put(key, bytes);
    for (let n = 0; n < 10; n++)
      await db
        .prepare(
          "INSERT INTO library_book_pdfs (id,tenant_id,book_id,position,file_name,size_bytes,r2_key,upload_status,page_count,created_at) VALUES (?,'a',?,?,'fixture.pdf',?,?,'completed',100,1)",
        )
        .bind(crypto.randomUUID(), id, n + 1, bytes.length, key)
        .run();
    await db
      .prepare(
        "WITH RECURSIVE pages(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM pages WHERE n<1000) INSERT INTO library_pages (tenant_id,book_id,page_no,ocr_status,ocr_markdown,ocr_figures) SELECT 'a',?,n,'succeeded','# Page ' || n || char(10) || 'Text.','[]' FROM pages",
      )
      .bind(id)
      .run();
    const p = { tenantId: "a", bookId: id, jobId: crypto.randomUUID(), generation: 1 };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?,'a',?,1,'ocr','owner',1)",
      )
      .bind(p.jobId, id)
      .run();
    await dispatch(p);
    await waitJob(p.jobId);
    expect(
      await db.prepare("SELECT page_count,status FROM library_books WHERE id = ?").bind(id).first(),
    ).toMatchObject({ page_count: 1000, status: "ready" });
    expect(
      await db
        .prepare("SELECT count(*) AS count FROM library_chapters WHERE book_id = ?")
        .bind(id)
        .first(),
    ).toMatchObject({ count: 1000 });
    expect(
      await db
        .prepare("SELECT count(*) AS count FROM library_chapter_revisions WHERE book_id = ?")
        .bind(id)
        .first(),
    ).toMatchObject({ count: 1000 });
    expect(
      await db
        .prepare("SELECT first_page_no FROM library_book_pdfs WHERE book_id = ? AND position = 10")
        .bind(id)
        .first(),
    ).toMatchObject({ first_page_no: 901 });
    const original = await db
      .prepare("SELECT id FROM library_chapters WHERE book_id = ? AND position = 1000")
      .bind(id)
      .first<{ id: string }>();
    await db.prepare("DELETE FROM library_chapters WHERE id = ?").bind(original?.id).run();
    await db.prepare("UPDATE library_books SET status = 'failed' WHERE id = ?").bind(id).run();
    const retry = { ...p, jobId: crypto.randomUUID() };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?,'a',?,1,'split','owner',1)",
      )
      .bind(retry.jobId, id)
      .run();
    await dispatch(retry);
    await waitJob(retry.jobId);
    expect(
      await db
        .prepare("SELECT id FROM library_chapters WHERE book_id = ? AND position = 1000")
        .bind(id)
        .first(),
    ).toEqual(original);
    expect(
      await db
        .prepare("SELECT count(*) AS count FROM library_chapter_revisions WHERE book_id = ?")
        .bind(id)
        .first(),
    ).toMatchObject({ count: 1000 });
  }, 120000);
  it("marks failed audio and can retry without duplicating the audio revision", async () => {
    const id = await createBook("TTS failure fixture");
    const chapter = crypto.randomUUID(),
      markdown = "This is a retry fixture.";
    await db
      .prepare(
        "INSERT INTO library_chapters (id,tenant_id,book_id,position,title,markdown,speech_hash,start_page,end_page,updated_at) VALUES (?,'a',?,1,'Chapter',?,?,1,1,1)",
      )
      .bind(chapter, id, markdown, await speechHash(markdown))
      .run();
    const createJob = async () => {
      const jobId = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO library_jobs (id,tenant_id,book_id,chapter_id,generation,type,created_by,created_at) VALUES (?,'a',?,?,1,'tts','owner',1)",
        )
        .bind(jobId, id, chapter)
        .run();
      await dispatch({ tenantId: "a", bookId: id, jobId, generation: 1 });
      return jobId;
    };
    const waitFailed = async (jobId: string) => {
      let status = "";
      for (let n = 0; n < 400 && status !== "failed"; n++) {
        status =
          (
            await db
              .prepare("SELECT status FROM library_jobs WHERE id = ?")
              .bind(jobId)
              .first<{ status: string }>()
          )?.status ?? "";
        if (status !== "failed") await new Promise((resolve) => setTimeout(resolve, 250));
      }
      expect(status).toBe("failed");
    };
    await bucket.put("_fake/tts-fail.json", JSON.stringify({ remaining: 4 }));
    try {
      const failed = await createJob();
      let status = "";
      for (let n = 0; n < 400 && status !== "failed"; n++) {
        status =
          (
            await db
              .prepare("SELECT status FROM library_jobs WHERE id = ?")
              .bind(failed)
              .first<{ status: string }>()
          )?.status ?? "";
        if (status !== "failed") await new Promise((resolve) => setTimeout(resolve, 250));
      }
      expect(status).toBe("failed");
      expect(
        await db.prepare("SELECT status FROM library_audios WHERE book_id = ?").bind(id).first(),
      ).toMatchObject({ status: "failed" });
      await bucket.delete("_fake/tts-fail.json");
      await waitJob(await createJob());
      expect(
        await db
          .prepare(
            "SELECT count(*) AS count FROM library_audios WHERE book_id = ? AND status = 'ready'",
          )
          .bind(id)
          .first(),
      ).toMatchObject({ count: 1 });
      const ready = await db
        .prepare(
          "SELECT status,r2_key,source_speech_hash,tts_model,duration_sec,size_bytes FROM library_audios WHERE book_id = ?",
        )
        .bind(id)
        .first();
      await bucket.put("_fake/tts-fail.json", JSON.stringify({ remaining: 4 }));
      const regeneration = await createJob();
      let active: { generation_job_id: string | null } | null = null;
      for (let n = 0; n < 100 && !active?.generation_job_id; n++) {
        active = await db
          .prepare("SELECT generation_job_id FROM library_audios WHERE book_id = ?")
          .bind(id)
          .first<{ generation_job_id: string | null }>();
        if (!active?.generation_job_id) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(active?.generation_job_id).toBe(`${regeneration}-1`);
      const competing = await createJob();
      await waitFailed(competing);
      expect(
        await db
          .prepare(
            "SELECT status,r2_key,source_speech_hash,tts_model,duration_sec,size_bytes FROM library_audios WHERE book_id = ?",
          )
          .bind(id)
          .first(),
      ).toEqual(ready);
      await waitFailed(regeneration);
      expect(
        await db
          .prepare(
            "SELECT status,r2_key,source_speech_hash,tts_model,duration_sec,size_bytes FROM library_audios WHERE book_id = ?",
          )
          .bind(id)
          .first(),
      ).toEqual(ready);
      expect(
        await db
          .prepare("SELECT generation_job_id FROM library_audios WHERE book_id = ?")
          .bind(id)
          .first(),
      ).toMatchObject({ generation_job_id: null });
      await bucket.delete("_fake/tts-fail.json");
      const replacement = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO library_jobs (id,tenant_id,book_id,chapter_id,generation,type,attempt,created_by,created_at) VALUES (?,'a',?,?,1,'tts',2,'owner',1)",
        )
        .bind(replacement, id, chapter)
        .run();
      const replacementRequest = { tenantId: "a", bookId: id, jobId: replacement, generation: 1 };
      await reserve(replacementRequest);
      const staleClaim = `${replacement}-1`,
        currentClaim = `${replacement}-2`;
      const release = () =>
        mf.dispatchFetch("http://localhost/p0/release-audio-claim", {
          method: "POST",
          body: JSON.stringify({
            tenantId: "a",
            bookId: id,
            chapterId: chapter,
            revision: 1,
            claim: staleClaim,
          }),
        });
      await db
        .prepare("UPDATE library_audios SET generation_job_id = ? WHERE book_id = ?")
        .bind(staleClaim, id)
        .run();
      await release();
      expect(
        await db
          .prepare("SELECT generation_job_id,status FROM library_audios WHERE book_id = ?")
          .bind(id)
          .first(),
      ).toMatchObject({ generation_job_id: null, status: "ready" });
      await db
        .prepare("UPDATE library_audios SET generation_job_id = ? WHERE book_id = ?")
        .bind(currentClaim, id)
        .run();
      await release();
      expect(
        await db
          .prepare("SELECT generation_job_id FROM library_audios WHERE book_id = ?")
          .bind(id)
          .first(),
      ).toMatchObject({ generation_job_id: currentClaim });
      await db
        .prepare("UPDATE library_audios SET generation_job_id = ? WHERE book_id = ?")
        .bind(staleClaim, id)
        .run();
      await dispatch(replacementRequest, false);
      await waitJob(replacement);
      expect(
        await db
          .prepare("SELECT status,r2_key,generation_job_id FROM library_audios WHERE book_id = ?")
          .bind(id)
          .first(),
      ).toMatchObject({
        status: "ready",
        r2_key: `library/a/${id}/g1/audio/${currentClaim}.mp3`,
        generation_job_id: null,
      });
    } finally {
      await bucket.delete("_fake/tts-fail.json");
    }
  }, 240000);

  it("counts PDFs, resumes OCR, crops figures and splits chapters with the fake provider", async () => {
    const id = await createBook("OCR fixture");
    const pdf = await PDFDocument.create();
    for (let n = 0; n < 3; n++) pdf.addPage([200, 300]);
    const bytes = await pdf.save(),
      key = `library/a/${id}/pdf/source.pdf`;
    await bucket.put(key, bytes);
    await db
      .prepare(
        "INSERT INTO library_book_pdfs (id,tenant_id,book_id,position,file_name,size_bytes,r2_key,upload_status,created_at) VALUES (?, 'a', ?, 1, 'fixture.pdf', ?, ?, 'completed', 1)",
      )
      .bind(crypto.randomUUID(), id, bytes.length, key)
      .run();
    const jobId = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?, 'a', ?, 1, 'ocr', 'owner', 1)",
      )
      .bind(jobId, id)
      .run();
    const p = { tenantId: "a", bookId: id, jobId, generation: 1 };
    await dispatch(p);
    await waitJob(jobId);
    expect(
      await db.prepare("SELECT status,page_count FROM library_books WHERE id = ?").bind(id).first(),
    ).toMatchObject({ status: "ready", page_count: 3 });
    expect(
      await db
        .prepare(
          "SELECT count(*) AS count FROM library_pages WHERE book_id = ? AND ocr_status = 'succeeded'",
        )
        .bind(id)
        .first(),
    ).toMatchObject({ count: 3 });
    expect(
      await db
        .prepare("SELECT count(*) AS count FROM library_figures WHERE book_id = ?")
        .bind(id)
        .first(),
    ).toMatchObject({ count: 1 });
    const usage = await db
      .prepare("SELECT count(*) AS count FROM library_job_usages WHERE book_id = ?")
      .bind(id)
      .first<{ count: number }>();
    expect(await dispatch(p)).toEqual({ instanceId: `${jobId}-1` });
    expect(
      (
        await db
          .prepare("SELECT count(*) AS count FROM library_job_usages WHERE book_id = ?")
          .bind(id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(usage?.count);
  });

  it("uploads a PDF and processes it through the public API only", async () => {
    const id = await createBook("Uploaded");
    const pdf = await PDFDocument.create();
    for (let n = 0; n < 3; n++) pdf.addPage([200, 300]);
    const bytes = await pdf.save();
    // A wrong browser-declared page count must not survive: the workflow recounts (3 pages).
    const created = await request(`books/${id}/pdfs`, "owner", "POST", {
      fileName: "uploaded.pdf",
      sizeBytes: bytes.length,
      pageCount: 99,
    });
    expect(created.status).toBe(201);
    const pdfId = (await data<{ pdf: { id: string } }>(created)).pdf.id;
    const uploaded = await mf.dispatchFetch(
      `http://localhost/api/library/books/${id}/pdfs/${pdfId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokens.get("owner")}`,
          "Content-Type": "application/pdf",
        },
        body: bytes,
      },
    );
    expect(uploaded.status).toBe(200);
    const stored = await bucket.list({ prefix: `library/a/${id}/pdfs/${pdfId}-` });
    expect(stored.objects.map((object) => object.size)).toEqual([bytes.length]);
    const processed = await request(`books/${id}/process`, "owner", "POST", {
      acknowledgedExternalProcessing: true,
      pdfIds: [pdfId],
    });
    expect(processed.status).toBe(202);
    const jobId = (await data<{ job: { id: string } }>(processed)).job.id;
    await waitJob(jobId);
    const jobs = await data<{ jobs: { id: string; status: string }[] }>(
      await request(`books/${id}/jobs`),
    );
    expect(jobs.jobs).toMatchObject([{ id: jobId, status: "succeeded" }]);
    expect(
      await db.prepare("SELECT status,page_count FROM library_books WHERE id = ?").bind(id).first(),
    ).toMatchObject({ status: "ready", page_count: 3 });
  });

  it("refuses OCR past the owner's monthly budget and shows why", async () => {
    // The owner has already used this month's pages.
    await db
      .prepare(
        "INSERT INTO library_ocr_reservations (instance_id,tenant_id,owner_id,book_id,month,pages,created_at) VALUES ('quota-full','a','owner','none',?,?,1)",
      )
      .bind(quotaMonth(), DEFAULT_OCR_PAGES_PER_USER_MONTH)
      .run();
    try {
      const id = await createBook("Over budget");
      const quotaPdf = crypto.randomUUID();
      const pdf = await PDFDocument.create();
      pdf.addPage([200, 300]);
      const bytes = await pdf.save(),
        key = `library/a/${id}/pdfs/quota.pdf`;
      await bucket.put(key, bytes);
      await db
        .prepare(
          "INSERT INTO library_book_pdfs (id,tenant_id,book_id,position,file_name,size_bytes,r2_key,upload_status,created_at) VALUES (?, 'a', ?, 1, 'quota.pdf', ?, ?, 'completed', 1)",
        )
        .bind(quotaPdf, id, bytes.length, key)
        .run();
      await db.prepare("UPDATE library_books SET status = 'uploading' WHERE id = ?").bind(id).run();
      const processed = await request(`books/${id}/process`, "owner", "POST", {
        acknowledgedExternalProcessing: true,
        pdfIds: [quotaPdf],
      });
      const jobId = (await data<{ job: { id: string } }>(processed)).job.id;
      await expect(waitJob(jobId)).rejects.toThrow(/Job failed/);
      expect(
        await db
          .prepare(
            "SELECT j.error_code, j.error_message, b.status FROM library_jobs j JOIN library_books b ON b.id = j.book_id WHERE j.id = ?",
          )
          .bind(jobId)
          .first(),
      ).toMatchObject({
        error_code: "rejected",
        error_message: expect.stringContaining(`${DEFAULT_OCR_PAGES_PER_USER_MONTH}ページ`),
        status: "failed",
      });
      // Refused before any paid call: no OCR usage was recorded for the book.
      expect(
        await db
          .prepare("SELECT count(*) AS n FROM library_job_usages WHERE book_id = ?")
          .bind(id)
          .first(),
      ).toEqual({ n: 0 });
    } finally {
      await db
        .prepare("DELETE FROM library_ocr_reservations WHERE instance_id = 'quota-full'")
        .run();
    }
  });

  it("starts a reservation whose RPC never ran from the scheduled handler", async () => {
    const id = await createBook("Redispatched");
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 300]);
    const bytes = await pdf.save(),
      key = `library/a/${id}/pdfs/cron.pdf`;
    await bucket.put(key, bytes);
    const jobId = crypto.randomUUID();
    // The state POST /process leaves behind when its startJob call fails.
    await db.batch([
      db
        .prepare(
          "INSERT INTO library_book_pdfs (id,tenant_id,book_id,position,file_name,size_bytes,r2_key,upload_status,created_at) VALUES (?, 'a', ?, 1, 'cron.pdf', ?, ?, 'completed', 1)",
        )
        .bind(crypto.randomUUID(), id, bytes.length, key),
      db.prepare("UPDATE library_books SET status = 'processing' WHERE id = ?").bind(id),
      db
        .prepare(
          "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?, 'a', ?, 1, 'ocr', 'owner', 1)",
        )
        .bind(jobId, id),
      db
        .prepare(
          "INSERT INTO library_job_dispatches (tenant_id,book_id,job_id,instance_id,created_at) VALUES ('a', ?, ?, ?, 0)",
        )
        .bind(id, jobId, `${jobId}-1`),
    ]);
    // Twenty older reservations on a book being deleted can never start; they must not fill the scan.
    const doomed = await createBook("Being deleted");
    await db.batch([
      db.prepare("UPDATE library_books SET status = 'deleting' WHERE id = ?").bind(doomed),
      ...Array.from({ length: 20 }, () => crypto.randomUUID()).flatMap((stale) => [
        db
          .prepare(
            "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?, 'a', ?, 1, 'ocr', 'owner', 0)",
          )
          .bind(stale, doomed),
        db
          .prepare(
            "INSERT INTO library_job_dispatches (tenant_id,book_id,job_id,instance_id,created_at) VALUES ('a', ?, ?, ?, -1)",
          )
          .bind(doomed, stale, `${stale}-1`),
      ]),
    ]);
    await (await mf.getWorker("narrator")).scheduled({ cron: "30 * * * *" });
    await waitJob(jobId);
    expect(
      await db
        .prepare(
          "SELECT dispatched_at IS NOT NULL AS dispatched FROM library_job_dispatches WHERE job_id = ?",
        )
        .bind(jobId)
        .first(),
    ).toEqual({ dispatched: 1 });
  });

  it("connects API to narrator and refuses public HTTP and stale/mismatched jobs", async () => {
    expect(
      await data<{ processingAvailable: boolean; upload: boolean }>(await request("capabilities")),
    ).toMatchObject({ processingAvailable: true, upload: true });
    const worker = await mf.getWorker("narrator");
    const publicResponse = await worker.fetch("https://narrator.test/jobs");
    expect(publicResponse.status).toBe(404);
    await publicResponse.text();
    const id = await createBook("workflow book");
    const p: NarratorJobRequest = {
      tenantId: "a",
      bookId: id,
      jobId: crypto.randomUUID(),
      generation: 1,
    };
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?, 'a', ?, 1, 'split', 'owner', 1)",
      )
      .bind(p.jobId, id)
      .run();
    await expect(dispatch({ ...p, tenantId: "b" })).rejects.toThrow();
    await expect(dispatch({ ...p, generation: 2 })).rejects.toThrow();
    await db
      .prepare("UPDATE library_jobs SET created_by = 'other' WHERE id = ?")
      .bind(p.jobId)
      .run();
    await expect(dispatch(p)).rejects.toThrow();
    await db
      .prepare("UPDATE library_jobs SET created_by = 'owner' WHERE id = ?")
      .bind(p.jobId)
      .run();
    await db
      .prepare(
        "INSERT INTO library_pages (tenant_id,book_id,page_no,ocr_status,ocr_markdown) VALUES ('a',?,1,'succeeded','# Chapter\n\nThis is a test.')",
      )
      .bind(id)
      .run();
    const first = await dispatch(p);
    expect(first.instanceId).toBe(`${p.jobId}-1`);
    await waitJob(p.jobId);
    const chapter = await db
      .prepare("SELECT id FROM library_chapters WHERE book_id = ?")
      .bind(id)
      .first<{ id: string }>();
    expect(chapter).not.toBeNull();
    const audioJob = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,chapter_id,generation,type,created_by,created_at) VALUES (?,'a',?,?,1,'tts','owner',1)",
      )
      .bind(audioJob, id, chapter?.id)
      .run();
    await dispatch({ ...p, jobId: audioJob });
    await waitJob(audioJob);
    const audio = await db
      .prepare("SELECT id,status,r2_key,size_bytes FROM library_audios WHERE book_id = ?")
      .bind(id)
      .first<{ id: string; status: string; r2_key: string; size_bytes: number }>();
    expect(audio?.status).toBe("ready");
    expect(audio?.size_bytes).toBeGreaterThan(0);
    const object = await bucket.get(audio?.r2_key ?? "");
    expect(object?.size).toBe(audio?.size_bytes);
    const ticket = async (user = "owner") => {
      const response = await mf.dispatchFetch("http://localhost/p0/media/tickets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.get(user)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId: id, audioId: audio?.id }),
      });
      if (response.status !== 201) throw new Error("Ticket refused");
      return ((await response.json()) as { path: string }).path;
    };
    await expect(ticket("other")).rejects.toThrow();
    const path = await ticket();
    const media = (options?: Parameters<Miniflare["dispatchFetch"]>[1]) =>
      mf.dispatchFetch(`http://localhost${path}`, options);
    const partial = await media({ headers: { Range: "bytes=1-10" } });
    expect(partial.status).toBe(206);
    expect(partial.headers.get("Content-Range")).toBe(`bytes 1-10/${audio?.size_bytes}`);
    expect((await partial.arrayBuffer()).byteLength).toBe(10);
    expect((await media({ method: "HEAD" })).headers.get("Content-Length")).toBe(
      String(audio?.size_bytes),
    );
    const invalid = await media({ headers: { Range: "bytes=999999999-" } });
    expect(invalid.status).toBe(416);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect((await media()).status).toBe(404);
    const renewed = await ticket();
    expect(
      (await mf.dispatchFetch(`http://localhost${renewed}`, { headers: { Range: "bytes=-10" } }))
        .status,
    ).toBe(206);
    await db.prepare("UPDATE profiles SET disabled = 1 WHERE id = 'owner'").run();
    expect((await mf.dispatchFetch(`http://localhost${renewed}`)).status).toBe(404);
    await db.prepare("UPDATE profiles SET disabled = 0 WHERE id = 'owner'").run();
    expect(
      (
        await db
          .prepare("SELECT count(*) AS count FROM library_job_usages WHERE book_id = ?")
          .bind(id)
          .first<{ count: number }>()
      )?.count,
    ).toBeGreaterThan(0);
    const pending = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO library_jobs (id,tenant_id,book_id,generation,type,created_by,created_at) VALUES (?, 'a', ?, 1, 'split', 'owner', 1)",
      )
      .bind(pending, id)
      .run();
    await request(`books/${id}`, "owner", "DELETE");
    await expect(dispatch({ ...p, jobId: pending })).rejects.toThrow();
    expect((await mf.dispatchFetch(`http://localhost${renewed}`)).status).toBe(404);
    expect((await bucket.get(audio?.r2_key ?? ""))?.size).toBeGreaterThan(0);
    expect((await mf.dispatchFetch("http://localhost/p0/cleanup", { method: "POST" })).status).toBe(
      200,
    );
    expect((await bucket.get(audio?.r2_key ?? ""))?.size).toBeGreaterThan(0); // 24-hour grace period.
    const neighbor = await createBook("Keep this book");
    await bucket.put(`library/a/${neighbor}/keep.mp3`, new Uint8Array([1]));
    await db
      .prepare(
        "INSERT INTO library_r2_deletions (prefix,tenant_id,book_id,created_at,not_before) VALUES (?,'a',?,1,0)",
      )
      .bind(`library/a/${neighbor}/`, id)
      .run(); // Mismatched prefix must never widen deletion.
    await db
      .prepare("UPDATE library_r2_deletions SET not_before = 0 WHERE prefix = ?")
      .bind(`library/a/${id}/`)
      .run();
    expect((await mf.dispatchFetch("http://localhost/p0/cleanup", { method: "POST" })).status).toBe(
      200,
    );
    expect(await bucket.get(audio?.r2_key ?? "")).toBeNull();
    expect(
      await db.prepare("SELECT id FROM library_books WHERE id = ?").bind(id).first(),
    ).toBeNull();
    expect(
      await db.prepare("SELECT id FROM library_jobs WHERE book_id = ?").bind(id).first(),
    ).toBeNull();
    expect((await bucket.get(`library/a/${neighbor}/keep.mp3`))?.size).toBe(1);
    await bucket.put(`library/a/${id}/g1/late.webp`, new Uint8Array([2]));
    await db
      .prepare("UPDATE library_r2_deletions SET not_before = 0 WHERE prefix = ?")
      .bind(`library/a/${id}/`)
      .run();
    await mf.dispatchFetch("http://localhost/p0/cleanup", { method: "POST" });
    expect(await bucket.get(`library/a/${id}/g1/late.webp`)).toBeNull();
    expect((await bucket.get(`library/a/${neighbor}/keep.mp3`))?.size).toBe(1);
  });
});
