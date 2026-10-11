import { NonRetryableError } from "cloudflare:workflows";
import type { NarratorJobRequest } from "@stella/shared/library/types";
import type { ProviderConfig, Usage } from "@stella/book-core/providers";
export interface JobRow {
  id: string;
  type: "ocr" | "split" | "tts";
  chapter_id: string | null;
  attempt: number;
  status: string;
}
export const RETRY = {
  retries: { limit: 3, delay: "10 seconds", backoff: "exponential" },
  timeout: "15 minutes",
} as const;
export function providerConfig(
  env: Pick<
    NarratorEnv,
    | "BUCKET"
    | "GEMINI_API_KEY"
    | "OCR_MODEL"
    | "TTS_MODEL"
    | "TTS_VOICE"
    | "TTS_LANGUAGE"
    | "FAKE_PROVIDERS"
  >,
): ProviderConfig {
  return {
    BUCKET: env.BUCKET,
    GEMINI_API_KEY: env.GEMINI_API_KEY ?? "",
    OCR_MODEL: env.OCR_MODEL,
    TTS_MODEL: env.TTS_MODEL,
    TTS_VOICE: env.TTS_VOICE,
    TTS_LANGUAGE: env.TTS_LANGUAGE,
    FAKE_PROVIDERS: env.FAKE_PROVIDERS,
  };
}
type JobEnv = Pick<
  NarratorEnv,
  "DB" | "BUCKET" | "LIBRARY_PROCESSING_ENABLED" | "FAKE_PROVIDERS" | "GEMINI_API_KEY"
>;
export function processingEnabled(
  env: Pick<JobEnv, "LIBRARY_PROCESSING_ENABLED" | "FAKE_PROVIDERS" | "GEMINI_API_KEY">,
): boolean {
  return (
    env.LIBRARY_PROCESSING_ENABLED === "1" &&
    (env.FAKE_PROVIDERS === "1" || Boolean(env.GEMINI_API_KEY))
  );
}
export function bookPrefix(p: NarratorJobRequest): string {
  return `library/${p.tenantId}/${p.bookId}/`;
}
export function generationPrefix(p: NarratorJobRequest): string {
  return `${bookPrefix(p)}g${p.generation}/`;
}
export function bookOutputPrefix(p: NarratorJobRequest, instanceId: string): string {
  return `${generationPrefix(p)}outputs/${instanceId}/`;
}
export class JobContext {
  constructor(
    readonly env: JobEnv,
    readonly p: NarratorJobRequest,
    readonly instanceId?: string,
  ) {}
  /** Rechecked on every step and in the SQL write itself, including after provider I/O. */
  get live(): string {
    return this.bookAuthority(true);
  }
  private bookAuthority(activeOwner: boolean): string {
    return `EXISTS (SELECT 1 FROM library_books b JOIN profiles owner ON owner.id = b.owner_id AND owner.tenant_id = b.tenant_id JOIN library_jobs j ON j.tenant_id = b.tenant_id AND j.book_id = b.id AND j.generation = b.generation JOIN library_job_dispatches d ON d.tenant_id = j.tenant_id AND d.book_id = j.book_id AND d.job_id = j.id AND d.instance_id = j.id || '-' || j.attempt WHERE b.tenant_id = ? AND b.id = ? AND b.generation = ? AND b.status <> 'deleting' AND ${activeOwner ? "owner.disabled = 0" : "j.status = 'failed'"} AND j.created_by = b.owner_id AND j.id = ? AND (? IS NULL OR d.instance_id = ?))`;
  }
  get bookScope(): [string, string, number] {
    return [this.p.tenantId, this.p.bookId, this.p.generation];
  }
  get scope(): [string, string, number, string, string | null, string | null] {
    return [...this.bookScope, this.p.jobId, this.instanceId ?? null, this.instanceId ?? null];
  }
  async authorize(): Promise<JobRow> {
    if (!processingEnabled(this.env)) throw new NonRetryableError("書籍処理が無効です");
    const row = await this.env.DB.prepare(
      `SELECT j.* FROM library_jobs j JOIN library_job_dispatches d ON d.tenant_id = j.tenant_id AND d.book_id = j.book_id AND d.job_id = j.id AND d.instance_id = j.id || '-' || j.attempt JOIN profiles actor ON actor.id = j.created_by AND actor.tenant_id = j.tenant_id JOIN library_books b ON b.id = j.book_id AND b.tenant_id = j.tenant_id WHERE j.tenant_id = ? AND j.book_id = ? AND j.id = ? AND j.generation = ? AND j.created_by = b.owner_id AND actor.disabled = 0 AND (? IS NULL OR d.instance_id = ?) AND ${this.live}`,
    )
      .bind(
        this.p.tenantId,
        this.p.bookId,
        this.p.jobId,
        this.p.generation,
        this.instanceId ?? null,
        this.instanceId ?? null,
        ...this.scope,
      )
      .first<JobRow>();
    if (!row) throw new NonRetryableError("ジョブが失効しています");
    return row;
  }
  async guard(): Promise<JobRow> {
    const job = await this.authorize();
    if (job.status !== "queued" && job.status !== "running")
      throw new NonRetryableError("ジョブは終了しています");
    return job;
  }
  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
    options?: R2PutOptions,
  ): Promise<void> {
    if (!key.startsWith(generationPrefix(this.p))) throw new NonRetryableError("保存先が無効です");
    await this.guard();
    await this.env.BUCKET.put(key, value, options);
    try {
      await this.guard();
    } catch (error) {
      // D1 unavailability does not prove authority was revoked. Keep the paid
      // checkpoint so the Workflow can resume it after a retryable failure.
      if (error instanceof NonRetryableError) await this.env.BUCKET.delete(key);
      throw error;
    }
  }
  async progress(current: number, total: number): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE library_jobs SET status = 'running', started_at = coalesce(started_at, ?), progress_current = ?, progress_total = ? WHERE tenant_id = ? AND book_id = ? AND id = ? AND generation = ? AND ${this.live}`,
    )
      .bind(
        Date.now(),
        current,
        total,
        this.p.tenantId,
        this.p.bookId,
        this.p.jobId,
        this.p.generation,
        ...this.scope,
      )
      .run();
  }
  async usage(
    model: string,
    usage: Usage,
    reference?: string,
    provider?: "fake" | "google",
  ): Promise<void> {
    await this.env.DB.batch(
      (["input_token", "output_token"] as const).map((unit) =>
        this.env.DB.prepare(
          `INSERT OR IGNORE INTO library_job_usages (id, tenant_id, book_id, job_id, provider, model, unit, quantity, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${this.live}`,
        ).bind(
          reference ? `${reference}:${unit}` : crypto.randomUUID(),
          this.p.tenantId,
          this.p.bookId,
          this.p.jobId,
          provider ?? (this.env.FAKE_PROVIDERS === "1" ? "fake" : "google"),
          model,
          unit,
          unit === "input_token" ? usage.inputTokens : usage.outputTokens,
          Date.now(),
          ...this.scope,
        ),
      ),
    );
  }
  private completion(): D1PreparedStatement {
    return this.env.DB.prepare(
      `UPDATE library_jobs SET status = 'succeeded', finished_at = ? WHERE tenant_id = ? AND book_id = ? AND id = ? AND generation = ? AND status IN ('queued','running','succeeded') AND ${this.live}`,
    ).bind(
      Date.now(),
      this.p.tenantId,
      this.p.bookId,
      this.p.jobId,
      this.p.generation,
      ...this.scope,
    );
  }
  async finish(): Promise<void> {
    const result = await this.completion().run();
    if (result.meta.changes !== 1) throw new NonRetryableError("ジョブの完了権限が失効しています");
  }
  async finishBook(): Promise<void> {
    // D1 batch commits job success and book readiness in the same transaction.
    const results = await this.env.DB.batch([
      this.completion(),
      this.env.DB.prepare(
        `UPDATE library_books SET status = 'ready', updated_at = ? WHERE tenant_id = ? AND id = ? AND generation = ? AND ${this.live} AND EXISTS (SELECT 1 FROM library_jobs j WHERE j.id = ? AND j.tenant_id = library_books.tenant_id AND j.book_id = library_books.id AND j.generation = library_books.generation AND j.status = 'succeeded')`,
      ).bind(Date.now(), ...this.bookScope, ...this.scope, this.p.jobId),
    ]);
    if (results.some((result) => result.meta.changes !== 1))
      throw new NonRetryableError("書籍の完了権限が失効しています");
  }
  async fail(): Promise<void> {
    // Provider responses and book contents never enter client-visible errors or logs.
    await this.env.DB.prepare(
      `UPDATE library_jobs SET status = 'failed', error_code = 'processing_failed', error_message = '処理に失敗しました。再試行してください。', finished_at = ? WHERE tenant_id = ? AND book_id = ? AND id = ? AND generation = ? AND status IN ('queued','running') AND (? IS NULL OR EXISTS (SELECT 1 FROM library_job_dispatches d WHERE d.tenant_id = library_jobs.tenant_id AND d.book_id = library_jobs.book_id AND d.job_id = library_jobs.id AND d.instance_id = ?))`,
    )
      .bind(
        Date.now(),
        this.p.tenantId,
        this.p.bookId,
        this.p.jobId,
        this.p.generation,
        this.instanceId ?? null,
        this.instanceId ?? null,
      )
      .run();
  }
  async failBook(): Promise<void> {
    await this.fail();
    // Disabling an owner stops work, but must still leave a retryable failure state.
    await this.env.DB.prepare(
      `UPDATE library_books SET status = 'failed', updated_at = ? WHERE tenant_id = ? AND id = ? AND generation = ? AND status <> 'ready' AND ${this.bookAuthority(false)}`,
    )
      .bind(Date.now(), ...this.bookScope, ...this.scope)
      .run();
  }
}
