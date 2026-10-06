import { and, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { addStudyDays, studyDateStartMs, toStudyDate } from "@stella/shared/study/activity";
import {
  forcedHumanReasons,
  isAssessmentKind,
  type RouteReason,
} from "@stella/shared/review/ai-review";
import { parsePublicTaskBundle } from "@stella/shared/tasks/catalog";
import {
  parseTaskSubmission,
  verifyTaskSubmission,
  type TaskSubmissionInput,
} from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import {
  aiReviewJobs,
  aiReviewOverrides,
  aiReviews,
  lessonProgress,
  lessons,
  notifications,
  sections,
  skillEvidence,
  stages,
  submissionChecks,
  submissionFiles,
  submissionReviews,
  submissions,
  taskPrivate,
  taskPrivateVersions,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, type Caller } from "./authz.js";
import { checkCiRun } from "./ci-run-check.js";
import { withResourceLock } from "./resource-lock.js";
import { reviewNotification } from "./review-notification.js";
import { loadCodingRuleSet } from "./coding-rule-set.js";
import { canAccessTask } from "./task-access.js";
import { withRecordedFixedStart } from "./task-fixed-start.js";
import { withRecordedHelp } from "./task-help.js";
import { hasRecordedSupport, isAssistedSubmission } from "./task-support.js";
import { variantRetentionSkills } from "./variant-reviews.js";

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createTaskSubmission(db: Db, caller: Caller, env: Env, raw: unknown) {
  let input: TaskSubmissionInput;
  try {
    input = parseTaskSubmission(raw);
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : "提出が不正です", 400);
  }
  const [task] = await db
    .select({
      id: tasks.id,
      stageId: sections.stageId,
      stageSlug: stages.slug,
      stageTitle: stages.title,
      sectionTitle: sections.title,
      contentHash: tasks.contentHash,
      variantOf: tasks.variantOf,
      privateFiles: taskPrivate.files,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .leftJoin(taskPrivate, eq(taskPrivate.taskId, tasks.id))
    .where(and(eq(tasks.id, input.taskId), eq(tasks.active, true)))
    .limit(1);
  // 予備の類題 (#39) は出題した受講者だけが提出できる。
  if (!task || !(await canAccessTask(db, caller, task, "write")))
    throw new ApiError("課題が見つかりません", 404);
  const [revision] = await db
    .select({ definition: taskRevisions.definition, bundle: taskRevisions.bundle })
    .from(taskRevisions)
    .where(and(eq(taskRevisions.taskId, task.id), eq(taskRevisions.contentHash, input.contentHash)))
    .limit(1);
  if (!revision)
    throw new ApiError("課題の版が見つかりません。配布した課題を開き直してください", 409);
  const bundle = parsePublicTaskBundle(JSON.parse(revision.bundle));
  const definition = JSON.parse(revision.definition) as {
    submit: { explanation: boolean; debuggingRecord: boolean };
    skills: { assesses: string[] };
  };
  if (input.mode === "submit" && definition.submit.explanation && !input.explanation.trim())
    throw new ApiError("説明を記入してください", 400);
  if (
    input.mode === "submit" &&
    definition.submit.debuggingRecord &&
    (!input.debuggingRecord || Object.values(input.debuggingRecord).some((v) => !v.trim()))
  )
    throw new ApiError("再現・期待と実際・原因・修正・回帰確認を記入してください", 400);
  let verified: Awaited<ReturnType<typeof verifyTaskSubmission>>;
  try {
    verified = await verifyTaskSubmission(input, bundle);
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : "提出が不正です", 400);
  }
  // CI と公開の課題は、申告した GitHub Actions の実行を GitHub の公開 API で確かめ、結果を
  // 機械の照合と一緒に残す (07 §5.5)。照合できない・食い違うときは人に回る (forcedHumanReasons)。
  // 提出の時点で 1 回だけ問い合わせ、応答は 5 秒で打ち切る。GitHub が一時的に落ちていても
  // 待ち行列でやり直さず、講師が実行と公開先のリンクを開いて確かめる (人のキューで必ず受け止める)。
  if (bundle.manifest.runner === "ci-deploy" && input.localResult.ci)
    verified.check.ci = await checkCiRun(
      { claim: input.localResult.ci, workflow: bundle.manifest.ci?.workflow },
      { token: env.GITHUB_API_TOKEN },
    );
  const bucket = env.SUBMISSIONS_BUCKET;
  if (!bucket) throw new ApiError("提出ファイルの保存先が未設定です", 503);
  const id = crypto.randomUUID();
  const files = verified.files.map((f, i) => ({
    ...f,
    objectKey: `submissions/${caller.tenantId}/${id}/${i}`,
  }));
  const writes = await Promise.allSettled(
    files.map((f) =>
      bucket.put(f.objectKey, f.data, {
        httpMetadata: { contentType: "application/octet-stream" },
      }),
    ),
  );
  const cleanup = async () => {
    if (files.length) await bucket.delete(files.map((f) => f.objectKey));
  };
  if (writes.some((r) => r.status === "rejected")) {
    await cleanup();
    throw new ApiError("提出ファイルの保存に失敗しました", 503);
  }
  let committed = false;
  try {
    const now = new Date();
    // 固定した開始点の受け取りとヒント・解答例・解説を開いた記録 (#36) は、提出の時刻を決めてから
    // 読む (提出の処理中の受け取り・開いた記録を読み漏らさない)。読み漏れた記録があっても、記録が
    // 提出の時刻より前なら `hasRecordedSupport` が AI の判定の直前とスキルの証拠を作るときに数える。
    const supportScope = { tenantId: caller.tenantId, userId: caller.id, taskId: task.id };
    const supportLog = await withRecordedHelp(
      db,
      supportScope,
      await withRecordedFixedStart(db, supportScope, input.support, now),
      now,
    );
    // 照合の食い違い・確認A・Bの支援・相談は、AI の結果を待たずに人のキューへ入れる (07 §6.3)。
    // それでも AI の下書きは作るので、どちらも AI の待ち行列には積む。確認A・Bの支援は、提出の
    // 申告に加えてサーバーの記録 (課題の AI チャット・相談、#38) も見る。支援記録は LMS が足した
    // 固定した開始点 (後の課題の開始点が、この課題の実装を含んでいた場合も) と、開いたヒント・
    // 解答例・解説 (#36) を含めたものを見る。
    const forced = forcedHumanReasons({
      kind: bundle.manifest.kind,
      mode: input.mode,
      machineCheck: verified.check,
      support: supportLog,
      recordedSupport:
        isAssessmentKind(bundle.manifest.kind) &&
        (await hasRecordedSupport(db, {
          tenantId: caller.tenantId,
          studentId: caller.id,
          taskId: task.id,
          submittedAt: now,
        })),
    });
    const progressStatus = forced.length === 0 ? "submitted" : "instructor-pending";
    // 非公開の素材 (解答例・観点) の版を、課題の版と同じ時点で記録する。課題の版のハッシュは
    // 非公開の素材を含まないので、素材の内容ハッシュで別に持つ (seed と同じ式)。今の task_private が
    // この提出の版の素材だと言えるのは、提出の版が今の版と同じときだけ。違えば記録せず、AI は
    // 判定しない (人に回る)。
    const privateVersion =
      task.privateFiles !== null && task.contentHash === input.contentHash
        ? { hash: await sha256Hex(task.privateFiles), files: task.privateFiles }
        : null;
    // コーディング規則の版も受け付けた時点で記録する (規則は seed で上書きされるため)。
    const ruleSetHash = (await loadCodingRuleSet(db, task.stageSlug)).hash;
    const result = await withResourceLock(
      db,
      taskSubmissionLockId(caller.tenantId, caller.id, task.id),
      async () => {
        const attempt = sql`(select coalesce(max(attempt), 0) + 1 from submissions where tenant_id = ${caller.tenantId} and student_id = ${caller.id} and task_id = ${task.id})`;
        const insert = db.insert(submissions).values({
          id,
          tenantId: caller.tenantId,
          studentId: caller.id,
          taskId: task.id,
          taskContentHash: input.contentHash,
          taskKind: bundle.manifest.kind,
          submissionMode: input.mode,
          localResult: input.localResult,
          testHashes: input.protected,
          explanation: input.explanation,
          debuggingRecord: input.debuggingRecord ?? null,
          supportLog,
          machineCheck: verified.check,
          taskSnapshot: { ...bundle, files: { "README.md": bundle.files["README.md"] ?? "" } },
          assessedSkills: definition.skills.assesses,
          stageTitle: task.stageTitle,
          sectionTitle: task.sectionTitle,
          assignmentTitle: bundle.manifest.title,
          code: "",
          attempt,
          submittedAt: now,
          aiReviewStatus: forced.length === 0 ? "queued" : "escalated",
          taskPrivateHash: privateVersion?.hash ?? null,
          ruleSetHash,
        });
        // 同じ課題を出し直したら、前の試行の AI レビューは新しい提出で置き換える (07 §6.3)。
        // 置き換えるのは判定前の試行 (AI の確認待ちと、人に回して講師の確認を待つもの) だけで、
        // AI か人が確定した試行は残す。講師が置き換え済みの試行を開いて確定しても、進捗は
        // 「合格があれば合格、無ければ最新の試行」で付け直すので、新しい試行の状態は崩れない。
        // 待ちを取り消すのも判定前の試行だけ。講師が先に確定した試行の AI は、一致率の評価のために
        // 結果を記録するので取り消さない。
        const earlier = db
          .select({ id: submissions.id })
          .from(submissions)
          .where(
            and(
              eq(submissions.tenantId, caller.tenantId),
              eq(submissions.studentId, caller.id),
              eq(submissions.taskId, task.id),
              ne(submissions.id, id),
              isNull(submissions.verdict),
            ),
          );
        const supersede = db
          .update(submissions)
          .set({ aiReviewStatus: "superseded" })
          .where(
            and(
              eq(submissions.tenantId, caller.tenantId),
              eq(submissions.studentId, caller.id),
              eq(submissions.taskId, task.id),
              ne(submissions.id, id),
              isNull(submissions.verdict),
              inArray(submissions.aiReviewStatus, ["queued", "escalated"]),
            ),
          );
        const cancel = db
          .update(aiReviewJobs)
          .set({ state: "cancelled", finishedAt: now })
          .where(
            and(eq(aiReviewJobs.state, "queued"), inArray(aiReviewJobs.submissionId, earlier)),
          );
        const enqueue = db.insert(aiReviewJobs).values({
          submissionId: id,
          tenantId: caller.tenantId,
          nextAttemptAt: now,
          enqueuedAt: now,
        });
        // 受け付けた時点の非公開の素材を版として残す (seed と同じ版なら既存の行のまま)。
        const keepPrivate = privateVersion
          ? [
              db
                .insert(taskPrivateVersions)
                .values({
                  taskId: task.id,
                  privateHash: privateVersion.hash,
                  files: privateVersion.files,
                  createdAt: now,
                })
                .onConflictDoNothing(),
            ]
          : [];
        const progress = db
          .insert(taskProgress)
          .values({
            userId: caller.id,
            taskId: task.id,
            contentHash: input.contentHash,
            status: progressStatus,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [taskProgress.userId, taskProgress.taskId],
            set: { contentHash: input.contentHash, status: progressStatus, updatedAt: new Date() },
            setWhere: sql`${taskProgress.status} not in ('passed', 'ai-passed')`,
          });
        await db.batch([
          insert,
          ...files.map(({ path, objectKey, sha256, bytes }) =>
            db.insert(submissionFiles).values({ submissionId: id, path, objectKey, sha256, bytes }),
          ),
          progress,
          supersede,
          cancel,
          enqueue,
          ...keepPrivate,
        ]);
        committed = true;
        const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
        if (!row) throw new Error("提出を再読込できませんでした");
        return row;
      },
      { ttlMs: 120_000 },
    );
    if (!result.ran) throw new ApiError("別の提出を保存中です。もう一度提出してください", 409);
    return result.value;
  } catch (e) {
    if (!committed) {
      // D1 が応答する前に接続が切れた場合、保存済みのファイルを消さない。
      const saved = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.id, id))
        .limit(1)
        .catch(() => null);
      if (saved && saved.length === 0) await cleanup();
    }
    throw e;
  }
}

/** ファイルの読み出しは呼び出し側で提出の所有者・テナントを確認してから行う。 */
export async function readSubmissionFiles(db: Db, env: Env, submissionId: string) {
  const rows = await db
    .select()
    .from(submissionFiles)
    .where(eq(submissionFiles.submissionId, submissionId));
  if (!env.SUBMISSIONS_BUCKET) throw new ApiError("提出ファイルの保存先が未設定です", 503);
  return Promise.all(
    rows.map(async (f) => {
      const object = await env.SUBMISSIONS_BUCKET?.get(f.objectKey);
      if (!object) throw new ApiError("提出ファイルを読み出せませんでした", 503);
      const data = new Uint8Array(await object.arrayBuffer());
      let binary = "";
      for (const byte of data) binary += String.fromCharCode(byte);
      return {
        path: f.path,
        sha256: f.sha256,
        bytes: f.bytes,
        content: btoa(binary),
        text: new TextDecoder().decode(data),
      };
    }),
  );
}

/**
 * AI のレビュー結果を、もう当てはめられない提出 (人が先に確定した・新しい提出で置き換えた・
 * 人に回す条件に当たる) に当てようとした。ロック待ちの 409 と区別するために分ける。
 */
export class AiReviewNotApplicable extends ApiError {
  constructor(message = "この提出は人のレビューが必要です") {
    super(message, 409);
    this.name = "AiReviewNotApplicable";
  }
}

/**
 * AI が合格にしようとした提出が、当てる直前に人に回す条件に当たった (例: 確定までの間に
 * 確認A・Bの支援の記録が届いた)。結果を捨てずに「人に回す」へ切り替えるために分ける。
 */
export class AiReviewNeedsHuman extends ApiError {
  constructor(readonly reasons: RouteReason[]) {
    super("この提出は人のレビューが必要です", 409);
    this.name = "AiReviewNeedsHuman";
  }
}

/** 確認A・Bで、提出より前にサーバーが記録した支援があるか (提出の申告とは別、#38)。 */
export async function assessmentRecordedSupport(
  db: Db,
  row: Pick<
    typeof submissions.$inferSelect,
    "tenantId" | "studentId" | "taskId" | "taskKind" | "submittedAt"
  >,
) {
  if (!isAssessmentKind(row.taskKind ?? "") || !row.studentId || !row.taskId) return false;
  return hasRecordedSupport(db, {
    tenantId: row.tenantId,
    studentId: row.studentId,
    taskId: row.taskId,
    submittedAt: row.submittedAt,
  });
}

/** 課題のロック (提出の保存・確定と共有)。確認A・Bの組のロックより先に取る。 */
export function taskSubmissionLockId(tenantId: string, studentId: string, taskId: string) {
  return `task-submission:${tenantId}:${studentId}:${taskId}`;
}

/**
 * AI のレビュー結果をこの提出に当ててよいか。課題のロックの中で読んだ行で決める。
 * 人が先に確定した提出・同じ課題の新しい提出がある試行には、遅れて届いた AI の結果を当てない
 * (人の判定が勝つ)。人に回す条件に当たる提出は、AI が合格にしない。
 */
async function assertAiApplicable(
  db: Db,
  row: typeof submissions.$inferSelect,
  outcome: "confirmed" | "escalated",
) {
  if (row.reviewedAt || row.verdict)
    throw new AiReviewNotApplicable("この提出はすでに確定しています");
  const allowed = outcome === "confirmed" ? ["queued"] : ["queued", "escalated"];
  if (!row.aiReviewStatus || !allowed.includes(row.aiReviewStatus))
    throw new AiReviewNotApplicable();
  if (outcome === "confirmed") {
    // 人に回す条件は、AI の結果を記録したあとに届いた支援の記録も含めて当てる直前に確かめ直す。
    // 当たれば合格にせず、呼び出し側が「人に回す」に切り替える (確認待ちのまま残さない)。
    const forced = forcedHumanReasons({
      kind: row.taskKind,
      mode: row.submissionMode,
      machineCheck: row.machineCheck ?? null,
      support: row.supportLog ?? null,
      recordedSupport: await assessmentRecordedSupport(db, row),
    });
    if (forced.length > 0) throw new AiReviewNeedsHuman(forced);
  }
  const [newer] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.tenantId, row.tenantId),
        eq(submissions.studentId, row.studentId ?? ""),
        eq(submissions.taskId, row.taskId ?? ""),
        gt(submissions.attempt, row.attempt),
      ),
    )
    .limit(1);
  if (newer) throw new AiReviewNotApplicable("同じ課題の新しい提出があります");
}

/**
 * 課題の進捗を、提出の記録から付け直す文。合格がある限り教材更新・再提出では取り消さない。
 * 合格が無ければ最新試行の状態を使う。AI の確認待ちだけが「AI が確認中」(submitted) になる。
 */
function recomputeTaskProgress(
  db: Db,
  row: { tenantId: string; studentId: string; taskId: string },
  now: Date,
) {
  return db
    .insert(taskProgress)
    .select(
      db
        .select({
          userId: sql<string>`${row.studentId}`.as("user_id"),
          taskId: sql<string>`${row.taskId}`.as("task_id"),
          status: sql<
            typeof taskProgress.$inferSelect.status
          >`case when verdict = 'pass' then case when review_source = 'ai' then 'ai-passed' else 'passed' end when verdict is not null then 'resubmit' when ai_review_status = 'queued' or (ai_review_status is null and case when json_valid(machine_check) then json_extract(machine_check, '$.matched') end = 1) then 'submitted' else 'instructor-pending' end`.as(
            "status",
          ),
          contentHash: sql<string>`task_content_hash`.as("content_hash"),
          updatedAt: sql<Date>`${now.getTime()}`.as("updated_at"),
          // 初回の合格日は DB のトリガー (0044_learning_pace) が入れる。
          passedAt: sql<Date | null>`null`.as("passed_at"),
        })
        .from(submissions)
        .where(
          and(
            eq(submissions.tenantId, row.tenantId),
            eq(submissions.studentId, row.studentId),
            eq(submissions.taskId, row.taskId),
          ),
        )
        .orderBy(desc(sql`case when verdict = 'pass' then 1 else 0 end`), desc(submissions.attempt))
        .limit(1),
    )
    .onConflictDoUpdate({
      target: [taskProgress.userId, taskProgress.taskId],
      set: {
        contentHash: sql`excluded.content_hash`,
        status: sql`excluded.status`,
        updatedAt: now,
      },
    });
}

/**
 * AI の一次レビューが人に回すと決めた提出を「講師の確認待ち」にする。
 * 合格の確定 (`reviewTaskSubmission`) と同じ課題のロックの中で、当ててよいかを確かめてから書く。
 * 当てられないときは結果を置き換え済みとして残し、`AiReviewNotApplicable` を投げる。
 */
export async function escalateTaskSubmission(
  db: Db,
  id: string,
  aiReviewId: string,
  waitMs = 5_000,
) {
  const [initial] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!initial?.taskId || !initial.studentId) throw new ApiError("課題の提出が見つかりません", 404);
  const { taskId, studentId } = initial;
  const locked = await withResourceLock(
    db,
    taskSubmissionLockId(initial.tenantId, studentId, taskId),
    async () => {
      const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
      if (!row) throw new ApiError("課題の提出が見つかりません", 404);
      const now = new Date();
      try {
        await assertAiApplicable(db, row, "escalated");
      } catch (e) {
        if (e instanceof AiReviewNotApplicable)
          await db
            .update(aiReviews)
            .set({ disposition: "superseded", appliedAt: now })
            .where(eq(aiReviews.id, aiReviewId));
        throw e;
      }
      await db.batch([
        db.update(submissions).set({ aiReviewStatus: "escalated" }).where(eq(submissions.id, id)),
        db
          .update(aiReviews)
          .set({ disposition: "applied", appliedAt: now })
          .where(eq(aiReviews.id, aiReviewId)),
        recomputeTaskProgress(db, { tenantId: row.tenantId, studentId, taskId }, now),
      ]);
    },
    { ttlMs: 120_000, waitMs },
  );
  if (!locked.ran) throw new ApiError("別の提出・レビューを保存中です", 409);
}

/** AI の判定案と人の判定が、合格か否かで食い違うか。 */
function overridesAi(aiVerdict: "pass" | "resubmit", human: "pass" | "resubmit" | "fail") {
  return (aiVerdict === "pass") !== (human === "pass");
}

/**
 * 提出に当てた AI の結果のうち最新のもの (人の判定を AI の判定と比べるのに使う)。
 * `outcome` を渡すと、その結果 (AI で確定 / 人に回した) だけを見る。
 */
async function appliedAiReview(db: Db, submissionId: string, outcome: "confirmed" | "escalated") {
  const [applied] = await db
    .select({ id: aiReviews.id, proposedVerdict: aiReviews.proposedVerdict })
    .from(aiReviews)
    .where(
      and(
        eq(aiReviews.submissionId, submissionId),
        eq(aiReviews.outcome, outcome),
        eq(aiReviews.disposition, "applied"),
      ),
    )
    .orderBy(desc(aiReviews.createdAt))
    .limit(1);
  return applied ?? null;
}

/**
 * 覆したあとの初回の合格日を付け直す文。0044 のトリガーは「最初に合格した日」を同じ版の間
 * 保つので、覆した合格の日付が残ると、出し直して合格したときに確認Bの予定 (学習ペース) が
 * 取り消した合格から数えられてしまう。残っている合格 (同じ版) の最初の合格の記録から付け直し、
 * 合格が残っていなければ消す。合格の記録が無い古い行は今の値を残す。
 */
function resetPassedAt(db: Db, row: { tenantId: string; studentId: string; taskId: string }) {
  const firstRemainingPass = sql`(select min(r.created_at) from submission_reviews r
    join submissions s on s.id = r.submission_id
    where s.tenant_id = ${row.tenantId} and s.student_id = ${row.studentId}
      and s.task_id = ${row.taskId} and s.verdict = 'pass' and r.verdict = 'pass'
      and s.task_content_hash = ${taskProgress.contentHash})`;
  return db
    .update(taskProgress)
    .set({
      passedAt: sql`case when ${taskProgress.status} in ('passed', 'ai-passed') then coalesce(${firstRemainingPass}, ${taskProgress.passedAt}) else null end`,
    })
    .where(and(eq(taskProgress.userId, row.studentId), eq(taskProgress.taskId, row.taskId)));
}

/**
 * 人と AI の一次レビューが共有する確定処理。AI は人に回す条件に当たる提出を合格にせず、
 * 人が先に確定した提出・新しい提出がある試行には結果を当てない (`aiReviewId` を置き換え済みにする)。
 *
 * 人の判定では、AI の判定と比べた記録も同じ batch で残す (#34)。
 * - AI が合格にした提出を人が合格以外にした = 事後確認で覆した。確認の記録 (`submission_checks`)
 *   と覆した記録を足し、この提出の合格・スキルの証拠・初回の合格日を取り消す (同じ課題の別の
 *   提出の合格は残る)。受講者には理由を知らせる。
 * - 人に回した提出の最初の判定が AI の判定案と食い違えば、覆した記録を足す。
 *
 * `requireUndecided` は「まだ誰も確定していない」ことを、`requireAiPass` は「AI の合格のまま」
 * であることを課題のロックの中で確かめる (二重の確定・別の講師の確定との競合を 409 にする)。
 */
export async function reviewTaskSubmission(
  db: Db,
  caller: Caller,
  id: string,
  verdict: "pass" | "resubmit" | "fail",
  notes: string,
  source: "human" | "ai" = "human",
  options: {
    aiReviewId?: string;
    waitMs?: number;
    requireUndecided?: boolean;
    requireAiPass?: boolean;
  } = {},
) {
  const [initial] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!initial?.taskId || !initial.studentId || initial.tenantId !== caller.tenantId)
    throw new ApiError("課題の提出が見つかりません", 404);
  const [meta] = await db
    .select({ sectionId: tasks.sectionId, pattern: tasks.pattern, variantOf: tasks.variantOf })
    .from(tasks)
    .where(eq(tasks.id, initial.taskId))
    .limit(1);
  // 確認A・Bは同じ単元・パターンの組で定着を判定するので、組のレビューを直列化する。
  // 課題ごとのロック (提出の保存と共有) の内側で取るので、取る順序は常に 課題 → 組。
  // 予備の類題 (#39) は組に入れない。時間を空けて確認できたかは出題の記録で決める。
  const scope: AssessmentScope | undefined =
    meta &&
    meta.variantOf === null &&
    (initial.taskKind === "assessment-a" || initial.taskKind === "assessment-b")
      ? { sectionId: meta.sectionId, pattern: meta.pattern }
      : undefined;
  const variantPattern = meta?.variantOf ? meta.pattern : null;
  const review = async () => {
    const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    if (!row?.taskId || !row.studentId) throw new ApiError("課題の提出が見つかりません", 404);
    const now = new Date();
    if (source === "ai") {
      try {
        if (verdict !== "pass") throw new AiReviewNotApplicable();
        await assertAiApplicable(db, row, "confirmed");
      } catch (e) {
        if (e instanceof AiReviewNotApplicable && options.aiReviewId)
          await db
            .update(aiReviews)
            .set({ disposition: "superseded", appliedAt: now })
            .where(eq(aiReviews.id, options.aiReviewId));
        throw e;
      }
    }
    if (options.requireUndecided && row.verdict !== null)
      throw new ApiError("別の講師が先に確定しました。提出を開き直してください", 409);
    const aiPassed = row.verdict === "pass" && row.reviewSource === "ai";
    if (options.requireAiPass && !aiPassed)
      throw new ApiError("この提出はもう AI の合格ではありません。提出を開き直してください", 409);
    // 人が AI の合格を合格以外にした = 事後確認で覆した。
    const overturned = source === "human" && aiPassed && verdict !== "pass";
    const confirmedReview = overturned ? await appliedAiReview(db, id, "confirmed") : null;
    // 人に回した提出の最初の判定。AI の判定案と食い違えば覆した記録を残す。
    const escalatedReview =
      source === "human" && row.verdict === null && row.aiReviewStatus === "escalated"
        ? await appliedAiReview(db, id, "escalated")
        : null;
    const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
      db
        .update(submissions)
        .set({
          verdict,
          status: verdict === "pass" ? "passed" : verdict === "fail" ? "failed" : "resubmit",
          reviewNotes: notes,
          reviewTaskContentHash: row.taskContentHash,
          reviewSource: source,
          reviewedAt: now,
          reviewerId: source === "human" ? caller.id : null,
          // AI の確認待ちのまま講師が確定したら「講師が先に確定」にする (「AI が確認中」を残さない)。
          // AI の結果は後から届いても当てず、一致率の評価のために記録だけする。
          ...(source === "ai"
            ? { aiReviewStatus: "confirmed" as const }
            : row.aiReviewStatus === "queued"
              ? { aiReviewStatus: "human" as const }
              : {}),
        })
        .where(eq(submissions.id, id)),
      db.insert(submissionReviews).values({
        submissionId: id,
        taskContentHash: row.taskContentHash,
        source,
        reviewerId: source === "human" ? caller.id : null,
        verdict,
        notes,
        createdAt: now,
      }),
      db.delete(skillEvidence).where(eq(skillEvidence.submissionId, id)),
    ];
    if (source === "ai" && options.aiReviewId)
      statements.push(
        db
          .update(aiReviews)
          .set({ disposition: "applied", appliedAt: now })
          .where(eq(aiReviews.id, options.aiReviewId)),
      );
    if (overturned) {
      statements.push(
        db.insert(submissionChecks).values({
          tenantId: row.tenantId,
          submissionId: id,
          aiReviewId: confirmedReview?.id ?? null,
          reviewerId: caller.id,
          result: "overturned",
          comment: notes,
          createdAt: now,
        }),
      );
      if (confirmedReview)
        statements.push(
          db.insert(aiReviewOverrides).values({
            tenantId: row.tenantId,
            submissionId: id,
            aiReviewId: confirmedReview.id,
            source: "post-check",
            aiVerdict: "pass",
            humanVerdict: verdict,
            reviewerId: caller.id,
            note: notes,
            createdAt: now,
          }),
        );
    }
    if (escalatedReview?.proposedVerdict && overridesAi(escalatedReview.proposedVerdict, verdict))
      statements.push(
        db.insert(aiReviewOverrides).values({
          tenantId: row.tenantId,
          submissionId: id,
          aiReviewId: escalatedReview.id,
          source: "final-review",
          aiVerdict: escalatedReview.proposedVerdict,
          humanVerdict: verdict,
          reviewerId: caller.id,
          note: notes,
          createdAt: now,
        }),
      );
    // 通知は課題のロックの中で読んだ保存前の行から決め、判定と同じ batch で書く。
    const notice = reviewNotification(row, verdict);
    if (notice && overturned) {
      // 覆したときは理由を知らせる (07 §6.4 の 6)。
      const reason = notes.trim();
      notice.title = `${row.assignmentTitle || "課題"} の合格が${verdict === "fail" ? "不合格" : "再提出"}に変わりました`;
      notice.body = `講師が確認し、AI の合格を取り消しました。${reason ? `理由: ${reason.slice(0, 300)}` : "フィードバックを確認してください。"}`;
    }
    if (notice) statements.push(db.insert(notifications).values(notice));
    if (verdict === "pass") {
      // 提出の申告に加え、この提出より前の AI チャット・相談などの記録も支援に数える (#38)。
      const assisted = await isAssistedSubmission(db, {
        ...row,
        studentId: row.studentId,
        taskId: row.taskId,
      });
      const basis =
        !assisted && row.taskKind === "assessment-b" && scope
          ? await retentionBasis(db, row.tenantId, row.studentId, scope)
          : null;
      // 時間を空けた類題 (#39) の自力の合格は、出題より前に同じパターンで自力の証拠があるスキルを
      // 「時間を空けて確認」にする (確認Bの定着と同じ考え方)。
      const spaced =
        !assisted && variantPattern
          ? await variantRetentionSkills(db, {
              tenantId: row.tenantId,
              studentId: row.studentId,
              taskId: row.taskId,
              pattern: variantPattern,
              submittedAt: row.submittedAt,
            })
          : null;
      for (const skillId of row.assessedSkills) {
        const level = assisted
          ? "supported"
          : spaced
            ? spaced.has(skillId)
              ? "retained"
              : "independent"
            : unassistedLevel(basis, row.submittedAt, skillId);
        statements.push(
          db.insert(skillEvidence).values({
            tenantId: row.tenantId,
            userId: row.studentId,
            skillId,
            level,
            submissionId: id,
            assisted,
            createdAt: now,
          }),
        );
      }
    }
    statements.push(
      recomputeTaskProgress(
        db,
        { tenantId: row.tenantId, studentId: row.studentId, taskId: row.taskId },
        now,
      ),
    );
    // 進捗を付け直した後に置く (トリガーが残した覆した合格の日付を上書きする)。
    if (overturned)
      statements.push(
        resetPassedAt(db, { tenantId: row.tenantId, studentId: row.studentId, taskId: row.taskId }),
      );
    await db.batch(statements);
    // 確認Aの判定が変わると、同じ組の確認Bの定着の前提も変わる。
    if (scope && row.taskKind === "assessment-a")
      await recomputeRetained(db, row.tenantId, row.studentId, scope);
    const [after] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    return after;
  };
  const locked = await withResourceLock(
    db,
    taskSubmissionLockId(initial.tenantId, initial.studentId, initial.taskId),
    async () => {
      if (!scope) return review();
      const inner = await withResourceLock(
        db,
        `task-assessment:${initial.tenantId}:${initial.studentId}:${scope.sectionId}:${scope.pattern}`,
        review,
        { ttlMs: 120_000, ...(options.waitMs ? { waitMs: options.waitMs } : {}) },
      );
      if (!inner.ran) throw new ApiError("別の提出・レビューを保存中です", 409);
      return inner.value;
    },
    { ttlMs: 120_000, ...(options.waitMs ? { waitMs: options.waitMs } : {}) },
  );
  if (!locked.ran) throw new ApiError("別の提出・レビューを保存中です", 409);
  return locked.value;
}

type AssessmentScope = { sectionId: string; pattern: string };

/**
 * 確認Bの合格を「定着」と数える前提。満たさなければ null。
 *
 * 学習ペースが確認Bを出すのと同じ基準で、同じ単元・同じパターンの確認A (有効なもの) の
 * 今の版にすべて合格していて、その最後の初回合格日の 7 学習日後 (`due`) 以降に提出したBだけが対象になる。
 * 課題は日程で閉じていないので、早く解いたBや無関係な課題の証跡では定着にしない。
 * そのうえで、それらの確認Aの支援なしの合格で証跡があるスキル (`skills`) に限る。
 */
async function retentionBasis(
  db: Db,
  tenantId: string,
  studentId: string,
  scope: AssessmentScope,
): Promise<{ due: number; skills: Set<string> } | null> {
  const preceding = await db
    .select({
      id: tasks.id,
      hash: tasks.contentHash,
      progressHash: taskProgress.contentHash,
      status: taskProgress.status,
      passedAt: taskProgress.passedAt,
    })
    .from(tasks)
    .leftJoin(
      taskProgress,
      and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, studentId)),
    )
    .where(
      and(
        eq(tasks.sectionId, scope.sectionId),
        eq(tasks.kind, "assessment-a"),
        eq(tasks.pattern, scope.pattern),
        eq(tasks.active, true),
        // 予備の類題 (#39) は出題した受講者にしか出ないので、確認Bの前提の確認Aに数えない。
        isNull(tasks.variantOf),
      ),
    );
  // 対応するAがない教材ではBを定着の確認として扱わない。
  if (preceding.length === 0) return null;
  let lastPassed = 0;
  for (const a of preceding) {
    // 合格を訂正しても同じ版なら passed_at は残る (0044 のトリガー) ので、今の状態も見る。
    // 学習ペースと同じく、今の版の確認Aへの合格だけを数える (旧版の合格は進捗に残っても使わない)。
    if (
      !a.passedAt ||
      a.progressHash !== a.hash ||
      (a.status !== "passed" && a.status !== "ai-passed")
    )
      return null;
    lastPassed = Math.max(lastPassed, a.passedAt.getTime());
  }
  // 証跡も今の版の確認Aへの提出に限る。版が変わって確かめなくなったスキルの古い証跡は使わない。
  const evidence = await db
    .selectDistinct({ skillId: skillEvidence.skillId })
    .from(skillEvidence)
    .innerJoin(submissions, eq(submissions.id, skillEvidence.submissionId))
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .where(
      and(
        eq(skillEvidence.userId, studentId),
        eq(skillEvidence.assisted, false),
        eq(submissions.tenantId, tenantId),
        eq(submissions.studentId, studentId),
        eq(submissions.taskContentHash, tasks.contentHash),
        inArray(
          submissions.taskId,
          preceding.map((a) => a.id),
        ),
      ),
    );
  return {
    due: studyDateStartMs(addStudyDays(toStudyDate(lastPassed), 7)),
    skills: new Set(evidence.map((e) => e.skillId)),
  };
}

/** 支援なしで合格した確認Bの水準。 */
function unassistedLevel(
  basis: { due: number; skills: Set<string> } | null,
  submittedAt: Date,
  skillId: string,
) {
  return basis && submittedAt.getTime() >= basis.due && basis.skills.has(skillId)
    ? ("retained" as const)
    : ("independent" as const);
}

/**
 * 確認Aの判定を確定・訂正したあと、同じ組の確認Bの支援なしの証跡の水準を付け直す。
 * Aの合格を取り消せば定着は自力に戻り、合格に戻せば定着に戻る。支援付きの証跡は変えない。
 */
async function recomputeRetained(
  db: Db,
  tenantId: string,
  studentId: string,
  scope: AssessmentScope,
) {
  const rows = await db
    .select({
      id: skillEvidence.id,
      skillId: skillEvidence.skillId,
      level: skillEvidence.level,
      submittedAt: submissions.submittedAt,
    })
    .from(skillEvidence)
    .innerJoin(submissions, eq(submissions.id, skillEvidence.submissionId))
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .where(
      and(
        eq(submissions.tenantId, tenantId),
        eq(submissions.studentId, studentId),
        eq(submissions.taskKind, "assessment-b"),
        eq(tasks.sectionId, scope.sectionId),
        eq(tasks.pattern, scope.pattern),
        // 類題の確認Bの水準は出題の記録で決める (`variantRetentionSkills`)。ここで付け直さない。
        isNull(tasks.variantOf),
        eq(skillEvidence.assisted, false),
      ),
    );
  if (rows.length === 0) return;
  const basis = await retentionBasis(db, tenantId, studentId, scope);
  const [first, ...rest] = rows.flatMap((r) => {
    const level = unassistedLevel(basis, r.submittedAt, r.skillId);
    return level === r.level
      ? []
      : [db.update(skillEvidence).set({ level }).where(eq(skillEvidence.id, r.id))];
  });
  if (first) await db.batch([first, ...rest]);
}

/**
 * 旧形式のコードレッスンもレビューの合格で完了する。
 *
 * lesson_id / assignment_id は受講者が送る値なので、同テナントのコードレッスンと
 * その課題の組を指す提出だけを進捗に結び付ける。文章・動画レッスンや別の課題を名乗る
 * 提出は、合格しても進捗に触らない (提出と添削そのものは従来どおり残る)。
 */
export async function syncReviewedLesson(db: Db, row: typeof submissions.$inferSelect) {
  if (!row.lessonId || !row.studentId || !row.assignmentId) return;
  const [lesson] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(
      and(
        eq(lessons.id, row.lessonId),
        eq(stages.tenantId, row.tenantId),
        eq(lessons.type, "code"),
        eq(lessons.assignmentId, row.assignmentId),
      ),
    )
    .limit(1);
  if (!lesson) return;
  // 合格の有無は書き込みと同じ文の中で読む。判定の保存とこの同期は別の文なので、
  // 先に読んでから書くと、同じ提出への判定の訂正が重なったときに遅れた側が古い
  // 「合格あり」で上書きしてしまう。最後の判定の保存のあとに走る同期は必ず最終の判定を読む。
  const passed = db
    .select({ one: sql`1` })
    .from(submissions)
    .innerJoin(
      lessons,
      and(eq(lessons.id, submissions.lessonId), eq(lessons.assignmentId, submissions.assignmentId)),
    )
    .where(
      and(
        eq(submissions.tenantId, row.tenantId),
        eq(submissions.studentId, row.studentId),
        eq(submissions.lessonId, lesson.id),
        eq(submissions.verdict, "pass"),
      ),
    );
  await db
    .insert(lessonProgress)
    .values({
      tenantId: row.tenantId,
      userId: row.studentId,
      lessonId: lesson.id,
      completed: sql<boolean>`exists ${passed}`,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { completed: sql`excluded.completed`, updatedAt: sql`excluded.updated_at` },
    });
}
