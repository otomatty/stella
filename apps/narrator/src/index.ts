import { WorkerEntrypoint } from "cloudflare:workers";
import type { NarratorJobRequest, NarratorCapabilities } from "@stella/shared/library/types";
import { JobContext, processingEnabled } from "./context";
import { cleanupDeletedBooks } from "./cleanup";
export { BookWorkflow } from "./workflows/book";
export { AudioWorkflow } from "./workflows/audio";
// Some runtimes return a disposable RPC reference; release it after the operation.
function releaseReference(value: object): void {
  const dispose: unknown = Reflect.get(value, Symbol.dispose);
  if (typeof dispose === "function") dispose.call(value);
}
async function existingInstance(workflow: Workflow<NarratorJobRequest>, id: string): Promise<void> {
  const instance = await workflow.get(id);
  try {
    await instance.status();
  } finally {
    releaseReference(instance);
  }
}
/** Idempotent per attempt: an existing Workflow instance for this attempt counts as started. */
async function dispatchJob(
  env: NarratorEnv,
  p: NarratorJobRequest,
): Promise<{ instanceId: string }> {
  const job = await new JobContext(env, p).authorize();
  const instanceId = `${job.id}-${job.attempt}`;
  const workflow = job.type === "tts" ? env.AUDIO_WORKFLOW : env.BOOK_WORKFLOW;
  if (job.status !== "queued" && job.status !== "running") {
    await existingInstance(workflow, instanceId);
    return { instanceId };
  }
  try {
    releaseReference(await workflow.create({ id: instanceId, params: p }));
  } catch (error) {
    // Duplicate dispatch succeeds only when that exact Workflow instance exists.
    try {
      await existingInstance(workflow, instanceId);
    } catch {
      throw error;
    }
  }
  await env.DB.prepare(
    "UPDATE library_job_dispatches SET dispatched_at = ? WHERE tenant_id = ? AND book_id = ? AND job_id = ? AND instance_id = ?",
  )
    .bind(Date.now(), p.tenantId, p.bookId, p.jobId, instanceId)
    .run();
  return { instanceId };
}
// A reservation whose RPC never confirmed is re-sent after this long.
const REDISPATCH_AFTER_MS = 60_000;
/** Starts reservations left behind by a failed RPC, without waiting for the owner to poll. */
async function redispatchPending(env: NarratorEnv): Promise<void> {
  if (!processingEnabled(env)) return;
  const pending = await env.DB.prepare(
    "SELECT j.tenant_id, j.book_id, j.id, j.generation FROM library_jobs j JOIN library_job_dispatches d ON d.tenant_id = j.tenant_id AND d.book_id = j.book_id AND d.job_id = j.id WHERE j.status = 'queued' AND d.dispatched_at IS NULL AND d.created_at < ? ORDER BY d.created_at LIMIT 20",
  )
    .bind(Date.now() - REDISPATCH_AFTER_MS)
    .all<{ tenant_id: string; book_id: string; id: string; generation: number }>();
  for (const job of pending.results) {
    try {
      await dispatchJob(env, {
        tenantId: job.tenant_id,
        bookId: job.book_id,
        jobId: job.id,
        generation: job.generation,
      });
    } catch {
      // A stale or revoked job stays unstarted; the next run or the owner's poll tries again.
    }
  }
}
/** Accessible only through STELLA's service binding. No OAuth/cookies/public processing API. */
export class Narrator extends WorkerEntrypoint<NarratorEnv> {
  async capabilities(): Promise<NarratorCapabilities> {
    return {
      configured: processingEnabled(this.env),
      provider:
        this.env.FAKE_PROVIDERS === "1"
          ? "fake"
          : this.env.GEMINI_API_KEY
            ? "gemini"
            : "unconfigured",
    };
  }
  async startJob(p: NarratorJobRequest): Promise<{ instanceId: string }> {
    if (
      !p ||
      !Number.isSafeInteger(p.generation) ||
      p.generation < 1 ||
      typeof p.tenantId !== "string" ||
      typeof p.bookId !== "string" ||
      typeof p.jobId !== "string"
    )
      throw new Error("Invalid job request");
    return dispatchJob(this.env, p);
  }
}
export default {
  fetch(): Response {
    return new Response("Not found", { status: 404 });
  },
  async scheduled(_controller: ScheduledController, env: NarratorEnv): Promise<void> {
    await cleanupDeletedBooks(env);
    await redispatchPending(env);
  },
} satisfies ExportedHandler<NarratorEnv>;
