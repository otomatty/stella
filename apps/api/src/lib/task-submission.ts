import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { addStudyDays, studyDateStartMs, toStudyDate } from "@stella/shared/study/activity";
import { parsePublicTaskBundle } from "@stella/shared/tasks/catalog";
import {
  parseTaskSubmission,
  verifyTaskSubmission,
  type TaskSubmissionInput,
} from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import {
  lessonProgress,
  lessons,
  sections,
  skillEvidence,
  stages,
  submissionFiles,
  submissionReviews,
  submissions,
  taskProgress,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { ApiError, type Caller } from "./authz.js";
import { withResourceLock } from "./resource-lock.js";
import { canAccessTasks } from "./task-access.js";

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
      stageTitle: stages.title,
      sectionTitle: sections.title,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(and(eq(tasks.id, input.taskId), eq(tasks.active, true)))
    .limit(1);
  if (!task || !(await canAccessTasks(db, caller, task.stageId, "write")))
    throw new ApiError("課題が見つかりません", 404);
  const [revision] = await db
    .select()
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
    const progressStatus = verified.check.matched ? "submitted" : "instructor-pending";
    const result = await withResourceLock(
      db,
      `task-submission:${caller.tenantId}:${caller.id}:${task.id}`,
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
          supportLog: input.support,
          machineCheck: verified.check,
          taskSnapshot: { ...bundle, files: { "README.md": bundle.files["README.md"] ?? "" } },
          assessedSkills: definition.skills.assesses,
          stageTitle: task.stageTitle,
          sectionTitle: task.sectionTitle,
          assignmentTitle: bundle.manifest.title,
          code: "",
          attempt,
          submittedAt: new Date(),
        });
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

/** AI の一次レビューからも同じ確定処理を利用できる。AI は機械照合の不一致を合格にしない。 */
export async function reviewTaskSubmission(
  db: Db,
  caller: Caller,
  id: string,
  verdict: "pass" | "resubmit" | "fail",
  notes: string,
  source: "human" | "ai" = "human",
) {
  const [initial] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!initial?.taskId || !initial.studentId || initial.tenantId !== caller.tenantId)
    throw new ApiError("課題の提出が見つかりません", 404);
  // 確認A・Bは同じ単元・パターンの組で定着を判定するので、組のレビューを直列化する。
  // 課題ごとのロック (提出の保存と共有) の内側で取るので、取る順序は常に 課題 → 組。
  const [scope] =
    initial.taskKind === "assessment-a" || initial.taskKind === "assessment-b"
      ? await db
          .select({ sectionId: tasks.sectionId, pattern: tasks.pattern })
          .from(tasks)
          .where(eq(tasks.id, initial.taskId))
          .limit(1)
      : [];
  const review = async () => {
    const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    if (!row?.taskId || !row.studentId) throw new ApiError("課題の提出が見つかりません", 404);
    if (source === "ai" && (row.machineCheck?.matched !== true || row.submissionMode === "consult"))
      throw new ApiError("この提出は人のレビューが必要です", 409);
    const now = new Date();
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
    if (verdict === "pass") {
      const assisted = (row.supportLog?.length ?? 0) > 0 || row.submissionMode === "consult";
      const basis =
        !assisted && row.taskKind === "assessment-b" && scope
          ? await retentionBasis(db, row.tenantId, row.studentId, scope)
          : null;
      for (const skillId of row.assessedSkills) {
        const level = assisted ? "supported" : unassistedLevel(basis, row.submittedAt, skillId);
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
    // 合格がある限り教材更新・再提出では取り消さない。合格が無ければ最新試行の状態を使う。
    statements.push(
      db
        .insert(taskProgress)
        .select(
          db
            .select({
              userId: sql<string>`${row.studentId}`.as("user_id"),
              taskId: sql<string>`${row.taskId}`.as("task_id"),
              status: sql<
                typeof taskProgress.$inferSelect.status
              >`case when verdict = 'pass' then case when review_source = 'ai' then 'ai-passed' else 'passed' end when verdict is not null then 'resubmit' when json_extract(machine_check, '$.matched') = 1 then 'submitted' else 'instructor-pending' end`.as(
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
            .orderBy(
              desc(sql`case when verdict = 'pass' then 1 else 0 end`),
              desc(submissions.attempt),
            )
            .limit(1),
        )
        .onConflictDoUpdate({
          target: [taskProgress.userId, taskProgress.taskId],
          set: {
            contentHash: sql`excluded.content_hash`,
            status: sql`excluded.status`,
            updatedAt: now,
          },
        }),
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
    `task-submission:${initial.tenantId}:${initial.studentId}:${initial.taskId}`,
    async () => {
      if (!scope) return review();
      const inner = await withResourceLock(
        db,
        `task-assessment:${initial.tenantId}:${initial.studentId}:${scope.sectionId}:${scope.pattern}`,
        review,
        { ttlMs: 120_000 },
      );
      if (!inner.ran) throw new ApiError("別の提出・レビューを保存中です", 409);
      return inner.value;
    },
    { ttlMs: 120_000 },
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
