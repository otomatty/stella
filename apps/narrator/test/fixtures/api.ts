// Test-only API host: production API never exposes job dispatch from HTTP.
import { Hono } from "hono";
import { libraryRoute } from "../../../api/src/routes/library.js";
import type { Env } from "../../../api/src/env.js";
import { mediaSpike } from "./media.js";
import { cleanupDeletedBooks } from "../../src/cleanup.js";
import { JobContext } from "../../src/context.js";
import type { NarratorJobRequest } from "@stella/shared/library/types";
import { releaseAudioClaim, type AudioTarget } from "../../src/audio-state.js";
const app = new Hono<{ Bindings: Env }>();
app.route("/", libraryRoute);
app.route("/p0/media", mediaSpike);
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
  await job.finish();
  await job.failBook();
  return c.json(
    await c.env.DB.prepare("SELECT status FROM library_jobs WHERE id = ?").bind(p.jobId).first(),
  );
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
