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
    const job = await new JobContext(this.env, p).authorize();
    const instanceId = `${job.id}-${job.attempt}`;
    const workflow = job.type === "tts" ? this.env.AUDIO_WORKFLOW : this.env.BOOK_WORKFLOW;
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
    await this.env.DB.prepare(
      "UPDATE library_job_dispatches SET dispatched_at = ? WHERE tenant_id = ? AND book_id = ? AND job_id = ? AND instance_id = ?",
    )
      .bind(Date.now(), p.tenantId, p.bookId, p.jobId, instanceId)
      .run();
    return { instanceId };
  }
}
export default {
  fetch(): Response {
    return new Response("Not found", { status: 404 });
  },
  async scheduled(_controller: ScheduledController, env: NarratorEnv): Promise<void> {
    await cleanupDeletedBooks(env);
  },
} satisfies ExportedHandler<NarratorEnv>;
