// Test-only API host: production API never exposes job dispatch from HTTP.
import { Hono } from "hono";
import { libraryRoute } from "../../../api/src/routes/library.js";
import type { Env } from "../../../api/src/env.js";
import { mediaSpike } from "./media.js";
import { cleanupDeletedBooks } from "../../src/cleanup.js";
import { JobContext, bookOutputPrefix, providerConfig } from "../../src/context.js";
import { audioSettings } from "../../src/audio-settings.js";
import { checkpointOcr } from "../../src/ocr-checkpoint.js";
import { readChapterState } from "../../src/book-state.js";
import type { OcrProvider } from "@stella/book-core/providers";
import type { NarratorJobRequest } from "@stella/shared/library/types";
import { releaseAudioClaim, type AudioTarget } from "../../src/audio-state.js";
import { putWhileWriting } from "../../src/audio-stream.js";
const app = new Hono<{ Bindings: Env }>();
app.route("/", libraryRoute);
app.route("/p0/media", mediaSpike);
app.post("/p0/transient-put", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  const p = await c.req.json<NarratorJobRequest>();
  let paid = false,
    readsAfterPaid = 0,
    readsBeforePut = -1;
  const raceDb = {
    prepare(sql: string) {
      return {
        bind(...values: (string | number | null)[]) {
          return {
            async first() {
              if (paid && ++readsAfterPaid === 1) throw new Error("Transient D1 failure");
              return c.env.DB.prepare(sql)
                .bind(...values)
                .first();
            },
          };
        },
      };
    },
  } as D1Database;
  const bucket = c.env.LIBRARY_BUCKET;
  const raceBucket = {
    get: bucket.get.bind(bucket),
    async put(...args: Parameters<R2Bucket["put"]>) {
      readsBeforePut = readsAfterPaid;
      return bucket.put(...args);
    },
    delete: bucket.delete.bind(bucket),
  } as R2Bucket;
  const job = new JobContext(
    {
      ...c.env,
      DB: raceDb,
      BUCKET: raceBucket,
      LIBRARY_PROCESSING_ENABLED: "1",
      FAKE_PROVIDERS: "1",
    },
    p,
    `${p.jobId}-1`,
  );
  const key = `library/${p.tenantId}/${p.bookId}/g1/ocr/${p.jobId}-1/checkpoint.json`;
  let calls = 0;
  const ocr: OcrProvider = {
    model: "fake-ocr",
    async upload() {
      return { name: "file", uri: "file" };
    },
    async read() {
      calls++;
      paid = true;
      return {
        text: '{"pages":[{"page":1,"markdown":"Text","figures":[]}]}',
        usage: { inputTokens: 258, outputTokens: 500 },
      };
    },
    async remove() {
      return undefined;
    },
  };
  let failed = false;
  await job.guard();
  try {
    await checkpointOcr(job, ocr, { name: "file", uri: "file" }, 1, 1, key);
  } catch {
    failed = true;
  }
  const retained = await c.env.LIBRARY_BUCKET.head(key);
  await job.guard();
  const result = await checkpointOcr(job, ocr, { name: "file", uri: "file" }, 1, 1, key);
  return c.json({ failed, retained: Boolean(retained), calls, readsBeforePut, text: result.text });
});
app.get("/p0/tts-settings", (c) => {
  const language = Reflect.get(c.env, "TTS_LANGUAGE");
  if (!c.env.LIBRARY_BUCKET || typeof language !== "string")
    return c.json({ error: "Missing test binding" }, 503);
  return c.json(
    audioSettings(
      providerConfig({
        BUCKET: c.env.LIBRARY_BUCKET,
        GEMINI_API_KEY: "",
        OCR_MODEL: "fake-ocr",
        TTS_MODEL: "fake-tts",
        TTS_VOICE: "Kore",
        TTS_LANGUAGE: language,
        FAKE_PROVIDERS: "1",
      }),
    ),
  );
});
app.post("/p0/chapter-state-race", async (c) => {
  const p = await c.req.json<NarratorJobRequest>();
  const winner = `library/${p.tenantId}/${p.bookId}/g1/chapters/winner.json`;
  let reads = 0;
  const raceDb = {
    prepare(sql: string) {
      return {
        bind(...values: (string | number | null)[]) {
          return {
            async first() {
              const state = await c.env.DB.prepare(sql)
                .bind(...values)
                .first();
              reads++;
              if (reads === 1)
                await c.env.DB.batch([
                  c.env.DB.prepare(
                    "UPDATE library_books SET chapter_plan_key = ? WHERE id = ?",
                  ).bind(winner, p.bookId),
                  c.env.DB.prepare(
                    "INSERT INTO library_chapters (id,tenant_id,book_id,position,title,markdown,speech_hash,start_page,end_page,updated_at) VALUES (?,'a',?,1,'Partial','Text','hash',1,1,1)",
                  ).bind(crypto.randomUUID(), p.bookId),
                ]);
              return state;
            },
          };
        },
      };
    },
  } as D1Database;
  const before = await readChapterState(raceDb, p);
  const after = await readChapterState(c.env.DB, p);
  return c.json({ before, after, reads, winner });
});
app.post("/p0/ocr-checkpoint", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  const p = await c.req.json<NarratorJobRequest>();
  const job = new JobContext(
    {
      ...c.env,
      BUCKET: c.env.LIBRARY_BUCKET,
      LIBRARY_PROCESSING_ENABLED: "1",
      FAKE_PROVIDERS: "1",
    },
    p,
    `${p.jobId}-1`,
  );
  let calls = 0;
  const ocr: OcrProvider = {
    model: "fake-ocr",
    async upload() {
      return { name: "file", uri: "file" };
    },
    async read() {
      calls++;
      return {
        text: '{"pages":[{"page":1,"markdown":"Text","figures":[]}]}',
        usage: { inputTokens: 258, outputTokens: 500 },
      };
    },
    async remove() {
      return undefined;
    },
  };
  const key = `library/${p.tenantId}/${p.bookId}/g1/ocr/${p.jobId}-1/range.json`;
  const file = { name: "file", uri: "file" };
  const result = await checkpointOcr(job, ocr, file, 1, 1, key);
  await job.usage(ocr.model, result.usage, result.reference);
  let writeFailed = false;
  try {
    await c.env.DB.prepare(
      "INSERT INTO tenants (id,name,created_at,updated_at) VALUES ('a','duplicate',1,1)",
    ).run();
  } catch {
    writeFailed = true;
  }
  const retry = await checkpointOcr(job, ocr, file, 1, 1, key);
  await job.usage(ocr.model, retry.usage, retry.reference);
  await job.progress(1, 1);
  return c.json({ calls, writeFailed, sameReference: retry.reference === result.reference });
});
app.post("/p0/put-replacement", async (c) => {
  const bucket = c.env.LIBRARY_BUCKET;
  if (!bucket) return c.json({ error: "No bucket" }, 503);
  const p = await c.req.json<NarratorJobRequest>();
  const oldKey = `${bookOutputPrefix(p, `${p.jobId}-1`)}pages/1.webp`;
  const newKey = `${bookOutputPrefix(p, `${p.jobId}-2`)}pages/1.webp`;
  const raceBucket = {
    async put(...args: Parameters<R2Bucket["put"]>) {
      const result = await bucket.put(...args);
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE library_jobs SET attempt = 2 WHERE id = ?").bind(p.jobId),
        c.env.DB.prepare("UPDATE library_job_dispatches SET instance_id = ? WHERE job_id = ?").bind(
          `${p.jobId}-2`,
          p.jobId,
        ),
      ]);
      await bucket.put(newKey, "replacement");
      return result;
    },
    delete: bucket.delete.bind(bucket),
  } as R2Bucket;
  const job = new JobContext(
    { ...c.env, BUCKET: raceBucket, LIBRARY_PROCESSING_ENABLED: "1", FAKE_PROVIDERS: "1" },
    p,
    `${p.jobId}-1`,
  );
  let rejected = false;
  try {
    await job.put(oldKey, "old");
  } catch {
    rejected = true;
  }
  return c.json({ oldKey, newKey, rejected });
});
app.post("/p0/stream-race", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  const p = await c.req.json<NarratorJobRequest>();
  const job = new JobContext(
    {
      ...c.env,
      BUCKET: c.env.LIBRARY_BUCKET,
      LIBRARY_PROCESSING_ENABLED: "1",
      FAKE_PROVIDERS: "1",
    },
    p,
    `${p.jobId}-1`,
  );
  await job.guard();
  await c.env.DB.prepare("UPDATE profiles SET disabled = 1 WHERE id = 'owner'").run();
  const { readable, writable } = new FixedLengthStream(3);
  const writer = writable.getWriter();
  const writing = (async () => {
    try {
      await writer.write(new Uint8Array([1, 2, 3]));
      await writer.close();
    } catch (error) {
      await writer.abort(error);
      throw error;
    }
  })();
  try {
    await putWhileWriting(writing, readable, () =>
      job.put(`library/a/${p.bookId}/g1/stream.mp3`, readable),
    );
    return c.json({ rejected: false });
  } catch {
    await job.fail();
    return c.json({ rejected: true });
  }
});
app.post("/p0/release-audio-claim", async (c) => {
  const { claim, ...target } = await c.req.json<AudioTarget & { claim: string }>();
  await releaseAudioClaim(c.env.DB, target, claim);
  return c.json({ ok: true });
});
app.post("/p0/fail-book", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  const p = await c.req.json<NarratorJobRequest>();
  const job = new JobContext(
    {
      ...c.env,
      BUCKET: c.env.LIBRARY_BUCKET,
      LIBRARY_PROCESSING_ENABLED: "1",
      FAKE_PROVIDERS: "1",
    },
    p,
    `${p.jobId}-1`,
  );
  try {
    await job.guard();
    return c.json({ error: "Job remains active" }, 409);
  } catch {
    await job.failBook();
    return c.json({ ok: true });
  }
});
app.post("/p0/finish", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  const { p, revoke, book } = await c.req.json<{
    p: NarratorJobRequest;
    revoke?: "disabled" | "superseded";
    book: boolean;
  }>();
  const job = new JobContext(
    {
      ...c.env,
      BUCKET: c.env.LIBRARY_BUCKET,
      LIBRARY_PROCESSING_ENABLED: "1",
      FAKE_PROVIDERS: "1",
    },
    p,
    `${p.jobId}-1`,
  );
  await job.guard();
  if (revoke === "disabled")
    await c.env.DB.prepare("UPDATE profiles SET disabled = 1 WHERE id = 'owner'").run();
  if (revoke === "superseded")
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE library_jobs SET attempt = 2, status = 'queued' WHERE id = ?").bind(
        p.jobId,
      ),
      c.env.DB.prepare("UPDATE library_job_dispatches SET instance_id = ? WHERE job_id = ?").bind(
        `${p.jobId}-2`,
        p.jobId,
      ),
    ]);
  try {
    if (book) await job.finishBook();
    else await job.finish();
    return c.json({ rejected: false });
  } catch {
    if (book) await job.failBook();
    else await job.fail();
    return c.json({ rejected: true });
  }
});
app.post("/p0/stale-attempt", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  const p = await c.req.json<NarratorJobRequest>();
  const job = new JobContext(
    {
      ...c.env,
      BUCKET: c.env.LIBRARY_BUCKET,
      LIBRARY_PROCESSING_ENABLED: "1",
      FAKE_PROVIDERS: "1",
    },
    p,
    `${p.jobId}-1`,
  );
  await job.guard();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE library_jobs SET attempt = 2 WHERE id = ?").bind(p.jobId),
    c.env.DB.prepare("UPDATE library_job_dispatches SET instance_id = ? WHERE job_id = ?").bind(
      `${p.jobId}-2`,
      p.jobId,
    ),
  ]);
  await job.progress(1, 1);
  let completionRejected = false;
  try {
    await job.finish();
  } catch {
    completionRejected = true;
  }
  await job.failBook();
  const row = await c.env.DB.prepare("SELECT status FROM library_jobs WHERE id = ?")
    .bind(p.jobId)
    .first();
  return c.json({ ...row, completionRejected });
});
app.post("/p0/put-race", async (c) => {
  const bucket = c.env.LIBRARY_BUCKET;
  if (!bucket) return c.json({ error: "No bucket" }, 503);
  const p = await c.req.json<NarratorJobRequest>();
  const raceBucket = {
    async put(...args: Parameters<R2Bucket["put"]>) {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE library_books SET status = 'deleting', generation = generation + 1 WHERE tenant_id = ? AND id = ?",
        ).bind(p.tenantId, p.bookId),
        c.env.DB.prepare(
          "INSERT INTO library_r2_deletions (prefix,tenant_id,book_id,created_at,not_before) VALUES (?,?,?,1,0)",
        ).bind(`library/${p.tenantId}/${p.bookId}/`, p.tenantId, p.bookId),
      ]);
      await cleanupDeletedBooks({ DB: c.env.DB, BUCKET: bucket });
      return bucket.put(...args);
    },
    delete: bucket.delete.bind(bucket),
  } as R2Bucket;
  try {
    const job = new JobContext(
      {
        ...c.env,
        BUCKET: raceBucket,
        LIBRARY_PROCESSING_ENABLED: "1",
        FAKE_PROVIDERS: "1",
      },
      p,
    );
    await job.put(`library/${p.tenantId}/${p.bookId}/g1/late.bin`, "late");
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Deleted during put" }, 400);
  }
});
app.post("/p0/cleanup", async (c) => {
  if (!c.env.LIBRARY_BUCKET) return c.json({ error: "No bucket" }, 503);
  await cleanupDeletedBooks({ DB: c.env.DB, BUCKET: c.env.LIBRARY_BUCKET });
  return c.json({ ok: true });
});
app.post("/p0/dispatch", async (c) => {
  try {
    return c.json(await c.env.NARRATOR?.startJob(await c.req.json()));
  } catch {
    return c.json({ error: "Dispatch refused" }, 400);
  }
});
export default { fetch: app.fetch };
