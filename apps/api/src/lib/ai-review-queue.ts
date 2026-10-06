/**
 * AI 一次レビューの待ち行列 (07 §6.6)。
 *
 * 提出を受けたら `ai_review_jobs` に積み (`createTaskSubmission` と同じ batch)、応答のあと
 * `waitUntil` でその 1 件を処理する。取りこぼし・時間切れ・やり直しは cron (`*\/15`) が拾う。
 * Cloudflare Queues は使わない — D1 の 1 文が不可分であることだけに頼る。
 *
 * - リース: 同じ提出を 2 つの Worker が同時に処理しないよう、`lease_until` までの間は
 *   1 つの Worker だけが持つ。期限が切れたものは誰でも取り直せる (処理中に落ちても詰まらない)。
 * - 呼び出し回数の上限: AI エンドポイントと同じく 60 秒に 20 回。直近 60 秒にリースを取った数を
 *   リースを取る文の中で数えるので、同時に走る Worker が上限を超えない。
 * - 受講者が結果を待つ処理なので Batch API は使わない (07 §6.6)。
 * - 想定外の失敗 (例外) も試行回数の上限で止める。上限に達したら行を閉じ、「AI が判定できなかった」
 *   として人に回す (AI が止まっても、提出は人のキューで必ず受け止める。07 §6.3)。
 */

import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { aiReviewJobs, submissions, taskProgress } from "../db/schema.js";
import type { Env } from "../env.js";
import {
  applyAiReview,
  escalateUnreviewable,
  pendingAiReviewId,
  runAiReview,
} from "./ai-review.js";

/** AI を呼ぶ回数の上限 (AI エンドポイントの `AI_RATE_LIMITER` と同じ 60 秒に 20 回)。 */
export const AI_REVIEW_RATE_LIMIT = { limit: 20, windowMs: 60_000 };
/**
 * AI の呼び出しをやり直す上限。超えたら「AI が判定できなかった」として人に回す。
 * 想定外の失敗 (例外) も同じ上限で止める (リースを取った回数で数える)。
 */
export const MAX_AI_REVIEW_ATTEMPTS = 3;
/** 提出直後 (waitUntil は応答後 30 秒まで) と cron の、AI 1 回あたりの待ち時間。 */
export const AI_REVIEW_TIMEOUTS = { afterSubmit: 20_000, sweep: 60_000 };
/** やり直しまでの間隔 (1 回目の失敗 → 1 分、2 回目 → 5 分)。 */
const RETRY_BACKOFF_MS = [60_000, 300_000];
/** 提出に当てるときのロック待ちで取れなかった場合の、次の試行までの間隔。 */
const BUSY_BACKOFF_MS = 30_000;
/** 終わった行を消すまでの期間。リースの数え方に使うのは直近 60 秒だけ。 */
const FINISHED_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface LeasedJob {
  submissionId: string;
  attempts: number;
  leaseId: string;
}

/**
 * 処理できる行を 1 件リースする。上限に達しているか、処理できる行が無ければ null。
 * 「直近の呼び出し数を数える → 空いていれば取る」を 1 文で行う。
 */
export async function leaseAiReviewJob(
  db: Db,
  opts: { now: number; leaseMs: number; submissionId?: string },
): Promise<LeasedJob | null> {
  const now = new Date(opts.now);
  const leaseId = crypto.randomUUID();
  const available = and(
    eq(aiReviewJobs.state, "queued"),
    or(isNull(aiReviewJobs.leaseUntil), lt(aiReviewJobs.leaseUntil, now)),
  );
  const next = db
    .select({ id: aiReviewJobs.submissionId })
    .from(aiReviewJobs)
    .where(
      and(
        available,
        sql`${aiReviewJobs.nextAttemptAt} <= ${opts.now}`,
        opts.submissionId ? eq(aiReviewJobs.submissionId, opts.submissionId) : undefined,
      ),
    )
    .orderBy(aiReviewJobs.nextAttemptAt, aiReviewJobs.enqueuedAt)
    .limit(1);
  const [leased] = await db
    .update(aiReviewJobs)
    .set({
      leaseId,
      leasedAt: now,
      leaseUntil: new Date(opts.now + opts.leaseMs),
      attempts: sql`${aiReviewJobs.attempts} + 1`,
    })
    .where(
      and(
        sql`${aiReviewJobs.submissionId} = (${next})`,
        available,
        sql`(select count(*) from ai_review_jobs where leased_at > ${
          opts.now - AI_REVIEW_RATE_LIMIT.windowMs
        }) < ${AI_REVIEW_RATE_LIMIT.limit}`,
      ),
    )
    .returning({ submissionId: aiReviewJobs.submissionId, attempts: aiReviewJobs.attempts });
  return leased ? { ...leased, leaseId } : null;
}

/** リースを持ったまま行を閉じる (完了)。リースを失っていたら何もしない。 */
async function finishJob(db: Db, job: LeasedJob, now: number, error: string | null = null) {
  await db
    .update(aiReviewJobs)
    .set({
      state: "done",
      finishedAt: new Date(now),
      leaseUntil: null,
      lastError: error?.slice(0, 500) ?? null,
    })
    .where(
      and(
        eq(aiReviewJobs.submissionId, job.submissionId),
        eq(aiReviewJobs.leaseId, job.leaseId),
        eq(aiReviewJobs.state, "queued"),
      ),
    );
}

/** リースを返して、時間を空けてやり直す。 */
async function releaseJob(db: Db, job: LeasedJob, now: number, delayMs: number, error: string) {
  await db
    .update(aiReviewJobs)
    .set({
      leaseUntil: null,
      nextAttemptAt: new Date(now + delayMs),
      lastError: error.slice(0, 500),
    })
    .where(
      and(
        eq(aiReviewJobs.submissionId, job.submissionId),
        eq(aiReviewJobs.leaseId, job.leaseId),
        eq(aiReviewJobs.state, "queued"),
      ),
    );
}

export type JobOutcome =
  | "applied"
  | "superseded"
  | "retry"
  | "busy"
  | "skipped"
  /** 想定外の失敗が上限まで続き、行を閉じて人に回した。 */
  | "gave-up";

/** リースした 1 件を処理する。 */
export async function processLeasedJob(
  env: Env,
  db: Db,
  job: LeasedJob,
  opts: { timeoutMs: number; now?: () => number; lockWaitMs?: number },
): Promise<JobOutcome> {
  const now = opts.now ?? Date.now;
  const [row] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, job.submissionId))
    .limit(1);
  // 新しい提出で置き換えた試行は AI を呼ばない。人が先に確定した提出は、一致率の評価に使うので
  // AI の結果だけを記録する (提出には当てない)。
  if (!row?.taskId || row.aiReviewStatus === "superseded") {
    await finishJob(db, job, now());
    return "skipped";
  }
  // 前のリースで結果を記録したまま当てられなかった (ロック待ち) なら、AI を呼び直さず当てる。
  let reviewId = await pendingAiReviewId(db, row.id);
  if (!reviewId) {
    const run = await runAiReview(env, db, row, {
      timeoutMs: opts.timeoutMs,
      finalAttempt: job.attempts >= MAX_AI_REVIEW_ATTEMPTS,
    });
    if (run.status === "retry") {
      const delay = RETRY_BACKOFF_MS[Math.min(job.attempts, RETRY_BACKOFF_MS.length) - 1] ?? 60_000;
      await releaseJob(db, job, now(), delay, run.detail);
      return "retry";
    }
    reviewId = run.reviewId;
  }
  const applied = await applyAiReview(db, reviewId, { lockWaitMs: opts.lockWaitMs });
  if (applied === "busy") {
    await releaseJob(db, job, now(), BUSY_BACKOFF_MS, "提出のロックを取れませんでした");
    return "busy";
  }
  await finishJob(db, job, now());
  return applied;
}

/**
 * 想定外の失敗が上限まで続いた行を閉じ、提出を人に回す。
 *
 * AI の呼び出しの失敗は `runAiReview` が回数で止めて記録するが、教材・提出の読み出しや当てはめで
 * 投げた例外は回数で止まらない。閉じないとリースの期限ごとに同じ失敗を繰り返し、提出は
 * 「AI が確認中」のまま人のキューにも入らない。
 */
async function giveUpJob(db: Db, job: LeasedJob, now: number, error: string): Promise<JobOutcome> {
  try {
    const applied = await escalateUnreviewable(db, job.submissionId, error);
    if (applied === "busy") {
      // 人が同じ提出を確定している最中。次の試行で記録済みの失敗を当て直す。
      await releaseJob(db, job, now, BUSY_BACKOFF_MS, "提出のロックを取れませんでした");
      return "busy";
    }
  } catch (e) {
    console.error("[ai-review] give up failed", job.submissionId, e);
    // 失敗の記録も当てられない (壊れた行など)。AI の確認待ちのまま残さず、提出の状態だけを
    // 人に回す。判定前で AI の確認待ちの提出に限るので、人の判定や新しい提出は上書きしない。
    const escalated = and(
      eq(submissions.id, job.submissionId),
      isNull(submissions.verdict),
      eq(submissions.aiReviewStatus, "queued"),
    );
    const of = (column: string) =>
      sql`(select ${sql.raw(column)} from submissions where id = ${job.submissionId} and verdict is null and ai_review_status = 'queued')`;
    await db.batch([
      // 進捗の文を先に置く (提出の状態を変えたあとでは、どの提出が対象かを読めない)。
      db
        .update(taskProgress)
        .set({ status: "instructor-pending", updatedAt: new Date(now) })
        .where(
          and(
            eq(taskProgress.status, "submitted"),
            sql`${taskProgress.userId} = ${of("student_id")}`,
            sql`${taskProgress.taskId} = ${of("task_id")}`,
          ),
        ),
      db.update(submissions).set({ aiReviewStatus: "escalated" }).where(escalated),
    ]);
  }
  await finishJob(db, job, now, error);
  return "gave-up";
}

/**
 * 待ち行列を処理する。`submissionId` を渡すとその提出だけを見る (提出直後の waitUntil)。
 * 上限に達したか処理できる行が無くなったら終わる。残りは次の cron が拾う。
 */
export async function processAiReviewQueue(
  env: Env,
  db: Db,
  opts: {
    timeoutMs: number;
    maxJobs: number;
    concurrency?: number;
    submissionId?: string;
    now?: () => number;
    /** 提出に当てるときのロック待ちの上限 (既定 5 秒)。 */
    lockWaitMs?: number;
  },
): Promise<JobOutcome[]> {
  const now = opts.now ?? Date.now;
  const outcomes: JobOutcome[] = [];
  let budget = opts.maxJobs;
  const worker = async () => {
    while (budget > 0) {
      budget--;
      const job = await leaseAiReviewJob(db, {
        now: now(),
        // リースは処理の上限 (AI の待ち時間 + DB とロック待ち) より長くする。
        leaseMs: opts.timeoutMs + 60_000,
        submissionId: opts.submissionId,
      });
      if (!job) return;
      try {
        outcomes.push(
          await processLeasedJob(env, db, job, {
            timeoutMs: opts.timeoutMs,
            now,
            lockWaitMs: opts.lockWaitMs,
          }),
        );
      } catch (e) {
        // 想定外の失敗。上限まではリースを返して後でやり直し、上限に達したら閉じて人に回す。
        console.error("[ai-review] job failed", job.submissionId, e);
        const error = e instanceof Error ? e.message : "unknown";
        try {
          if (job.attempts >= MAX_AI_REVIEW_ATTEMPTS)
            outcomes.push(await giveUpJob(db, job, now(), error));
          else await releaseJob(db, job, now(), RETRY_BACKOFF_MS[0] ?? 60_000, error);
        } catch (inner) {
          // 返せなくてもリースの期限で開く (次の試行で上限の判定をし直す)。
          console.error("[ai-review] release failed", job.submissionId, inner);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 1) }, worker));
  return outcomes;
}

/** cron: 待ち行列を処理し、古い終了済みの行を消す。 */
export async function runAiReviewSweep(env: Env, db: Db, now: () => number = Date.now) {
  await db
    .delete(aiReviewJobs)
    .where(
      and(
        sql`${aiReviewJobs.state} in ('done', 'cancelled')`,
        lt(aiReviewJobs.finishedAt, new Date(now() - FINISHED_RETENTION_MS)),
      ),
    );
  return processAiReviewQueue(env, db, {
    timeoutMs: AI_REVIEW_TIMEOUTS.sweep,
    maxJobs: AI_REVIEW_RATE_LIMIT.limit,
    concurrency: 4,
    now,
  });
}
