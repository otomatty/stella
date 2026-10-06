/**
 * ヒント・解答例・解説を、解放条件 (07 §8) を満たした受講者にだけ返す (#36)。
 *
 * - 判定は `@stella/shared/tasks/help` の `taskHelpAccess` (拡張と同じ表) をサーバーで当てる。
 *   拡張・Web の表示制御だけに頼らない。
 * - 本文は `task_private` (seed が入れる非公開の素材) から読む。返すのはヒント (`hints.md` の段)・
 *   解答例 (`solution/`)・解説 (`explanation.md`) だけで、予備の類題 (`variants/`) とレビューの
 *   観点 (`review.md`) はどの条件でも返さない。
 * - 開いたら `task_help_opens` に記録してから返す (記録できなければ返さない)。記録は提出の支援
 *   記録に足し (`withRecordedHelp`)、水準と確認A・Bの人に回す判定 (`hasRecordedSupport`) にも効く。
 *   固定した開始点 (`task_fixed_start_uses` → `withRecordedFixedStart`) と同じ形にそろえている。
 */

import { and, asc, count, desc, eq, lte } from "drizzle-orm";
import type { TaskStatus } from "@stella/shared/tasks/catalog";
import {
  countHelpAttempts,
  HELP_LOCK_LABELS,
  type HelpAvailability,
  type HelpItem,
  type HelpItemView,
  helpItemAvailability,
  type HelpSolutionFile,
  parseTaskHints,
  supportConfigOf,
  type TaskHelpAccess,
  type TaskHelpResponse,
  type TaskHint,
  type TaskSupportConfig,
  taskHelpAccess,
} from "@stella/shared/tasks/help";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import type { SupportEvent } from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import {
  sections,
  submissions,
  taskHelpOpens,
  taskLocalRuns,
  taskPrivate,
  taskProgress,
  tasks,
} from "../db/schema.js";
import { ApiError, type Caller } from "./authz.js";
import { canAccessTasks } from "./task-access.js";

type Scope = { tenantId: string; userId: string; taskId: string };

/** 受講者がこの課題で開いた記録 (テナント・本人・課題で絞る)。 */
export function helpOpensOf(scope: Scope) {
  return and(
    eq(taskHelpOpens.tenantId, scope.tenantId),
    eq(taskHelpOpens.userId, scope.userId),
    eq(taskHelpOpens.taskId, scope.taskId),
  );
}

interface HelpOpen {
  item: HelpItem;
  level: number;
  openedAt: Date;
  afterPass: boolean;
}

/**
 * 開いた記録を、提出の支援記録の形にまとめる。ヒントは最初に開いた時刻で 1 件 (detail に開いた
 * 最も深い段)、解答例・解説はそれぞれ 1 件。`opens` は時刻の古い順。
 */
export function helpSupportEvents(opens: HelpOpen[]): SupportEvent[] {
  const events: SupportEvent[] = [];
  const hints = opens.filter((o) => o.item === "hint");
  if (hints.length > 0)
    events.push({
      kind: "hint",
      at: hints[0].openedAt.toISOString(),
      detail: `ヒントを ${Math.max(...hints.map((h) => h.level))} 段目まで開いた記録 (LMS)`,
    });
  for (const item of ["solution", "explanation"] as const) {
    const open = opens.find((o) => o.item === item);
    if (open)
      events.push({
        kind: "solution",
        at: open.openedAt.toISOString(),
        detail: `${item === "solution" ? "解答例" : "解説"}を開いた記録 (LMS${open.afterPass ? "・合格後" : ""})`,
      });
  }
  return events;
}

/**
 * 提出の支援記録に、提出の時刻までに開いたヒント・解答例・解説を足す。拡張の記録や受講者の申告は
 * 手元で消せるので、サーバーの記録で補う。支援付きの合格はスキルの証拠を「支援付き」にする
 * (罰ではなく記録)。提出より後に開いたものは、その提出の支援に数えない。
 */
export async function withRecordedHelp(
  db: Db,
  scope: Scope,
  support: SupportEvent[],
  submittedAt: Date,
): Promise<SupportEvent[]> {
  const opens = await db
    .select({
      item: taskHelpOpens.item,
      level: taskHelpOpens.level,
      openedAt: taskHelpOpens.openedAt,
      afterPass: taskHelpOpens.afterPass,
    })
    .from(taskHelpOpens)
    .where(and(helpOpensOf(scope), lte(taskHelpOpens.openedAt, submittedAt)))
    .orderBy(asc(taskHelpOpens.openedAt));
  const added = helpSupportEvents(opens).filter(
    (event) =>
      !support.some((e) => e.kind === event.kind && e.at === event.at && e.detail === event.detail),
  );
  return added.length > 0 ? [...support, ...added] : support;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function decodeBase64(value: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));
}

/** 解放の判定と本文に要るもの。どれもサーバーの記録から読む (受講者の申告は使わない)。 */
interface HelpContext {
  task: { id: string; title: string; kind: TaskKind; contentHash: string };
  status: TaskStatus;
  passed: boolean;
  support: TaskSupportConfig;
  privateHash: string | null;
  hints: TaskHint[];
  solution: HelpSolutionFile[];
  explanation: string | null;
  opens: HelpOpen[];
  attempts: number;
  latestSubmission: { id: string; attempt: number } | null;
}

const PASSED: readonly TaskStatus[] = ["passed", "ai-passed"];

/**
 * 受講者が読める課題 (`canAccessTasks`: 同じテナントの公開中の format 2 で、受講中か修了) の
 * 解放の判定に要るものを集める。読めない課題は 404 (課題があるかどうかも返さない)。
 */
async function loadHelpContext(db: Db, caller: Caller, taskId: string): Promise<HelpContext> {
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      kind: tasks.kind,
      contentHash: tasks.contentHash,
      definition: tasks.definition,
      stageId: sections.stageId,
      privateFiles: taskPrivate.files,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .leftJoin(taskPrivate, eq(taskPrivate.taskId, tasks.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.active, true)))
    .limit(1);
  if (!row || !(await canAccessTasks(db, caller, row.stageId)))
    throw new ApiError("task not found", 404);
  const scope = { tenantId: caller.tenantId, userId: caller.id, taskId: row.id };
  const [[progress], [runs], [submitted], [latest], opens] = await Promise.all([
    db
      .select({ status: taskProgress.status, contentHash: taskProgress.contentHash })
      .from(taskProgress)
      .where(and(eq(taskProgress.userId, caller.id), eq(taskProgress.taskId, row.id)))
      .limit(1),
    db
      .select({ failed: taskLocalRuns.failedRuns })
      .from(taskLocalRuns)
      .where(
        and(
          eq(taskLocalRuns.tenantId, caller.tenantId),
          eq(taskLocalRuns.userId, caller.id),
          eq(taskLocalRuns.taskId, row.id),
        ),
      )
      .limit(1),
    db
      .select({ n: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.tenantId, caller.tenantId),
          eq(submissions.studentId, caller.id),
          eq(submissions.taskId, row.id),
        ),
      ),
    db
      .select({ id: submissions.id, attempt: submissions.attempt })
      .from(submissions)
      .where(
        and(
          eq(submissions.tenantId, caller.tenantId),
          eq(submissions.studentId, caller.id),
          eq(submissions.taskId, row.id),
        ),
      )
      .orderBy(desc(submissions.submittedAt))
      .limit(1),
    db
      .select({
        item: taskHelpOpens.item,
        level: taskHelpOpens.level,
        openedAt: taskHelpOpens.openedAt,
        afterPass: taskHelpOpens.afterPass,
      })
      .from(taskHelpOpens)
      .where(helpOpensOf(scope))
      .orderBy(asc(taskHelpOpens.openedAt)),
  ]);
  // 一覧 (`/api/tasks/for-stage`) と同じく、合格は版が変わっても合格のまま。
  const passed = progress !== undefined && PASSED.includes(progress.status);
  const status: TaskStatus =
    progress && (progress.contentHash === row.contentHash || passed)
      ? progress.status
      : "not-started";
  const files = row.privateFiles ? (JSON.parse(row.privateFiles) as Record<string, string>) : {};
  let support = supportConfigOf(JSON.parse(row.definition));
  let hints: TaskHint[] = [];
  const parsed =
    files["hints.md"] !== undefined ? parseTaskHints(decodeBase64(files["hints.md"])) : null;
  if (parsed?.ok) {
    hints = parsed.hints;
    // 段に分けられたヒントより多くは数えない (開けない段を待たせない)。
    support = { ...support, hintLevels: Math.min(support.hintLevels, hints.length) };
  } else {
    // 教材の検査で止めている形の誤り。ヒントを出さず、解答例も合格後だけにする (いちばん厳しい側)。
    // 本文はログに出さない。
    if (parsed) console.warn("[task-help] hints.md を段に分けられません", row.id);
    support = { hintLevels: 0, solutionUnlock: "passed" };
  }
  return {
    task: {
      id: row.id,
      title: row.title,
      kind: row.kind as TaskKind,
      contentHash: row.contentHash,
    },
    status,
    passed,
    support,
    privateHash: row.privateFiles ? await sha256Hex(row.privateFiles) : null,
    hints,
    solution: Object.entries(files)
      .filter(([path]) => path.startsWith("solution/") && !path.endsWith("/.gitkeep"))
      .map(([path, content]) => ({ path: path.slice("solution/".length), content })),
    explanation: files["explanation.md"] ? decodeBase64(files["explanation.md"]) : null,
    opens,
    attempts: countHelpAttempts({
      failedLocalRuns: runs?.failed ?? 0,
      submissions: submitted?.n ?? 0,
    }),
    latestSubmission: latest ?? null,
  };
}

const NOT_OFFERED: HelpAvailability = { open: false, reason: "not-offered" };

/** 表の判定に、素材が教材に無いこと (解答例のファイルや解説が無い) を重ねる。 */
function accessOf(ctx: HelpContext): TaskHelpAccess {
  const access = taskHelpAccess({
    kind: ctx.task.kind,
    support: ctx.support,
    passed: ctx.passed,
    attempts: ctx.attempts,
    openedHintLevel: Math.max(0, ...ctx.opens.filter((o) => o.item === "hint").map((o) => o.level)),
  });
  return {
    ...access,
    solution: ctx.solution.length > 0 ? access.solution : NOT_OFFERED,
    explanation: ctx.explanation !== null ? access.explanation : NOT_OFFERED,
  };
}

function viewOf(availability: HelpAvailability, opened: boolean): HelpItemView {
  if (!availability.open) return { state: "locked", reason: availability.reason };
  return opened ? { state: "opened" } : { state: "available" };
}

/**
 * 応答を組み立てる。本文は「開いた記録があり、今も開ける」素材だけに付ける。まだ開いていない
 * 素材は状態だけを返し、ヒントの題も開くまでは返さない (題が答えを示しうるため)。
 */
function helpResponse(ctx: HelpContext): TaskHelpResponse {
  const access = accessOf(ctx);
  const opened = (item: HelpItem, level = 0) =>
    ctx.opens.some((o) => o.item === item && o.level === level);
  const solution = viewOf(access.solution, opened("solution"));
  const explanation = viewOf(access.explanation, opened("explanation"));
  return {
    taskId: ctx.task.id,
    title: ctx.task.title,
    kind: ctx.task.kind,
    status: ctx.status,
    phase: access.phase,
    referencesOnly: access.referencesOnly,
    notice: access.notice,
    attempts: access.attempts,
    hints: access.hints.map((availability, i) => {
      const level = i + 1;
      const view = viewOf(availability, opened("hint", level));
      const hint = ctx.hints[i];
      return view.state === "opened" && hint
        ? { ...view, level, title: hint.title, markdown: hint.markdown }
        : { ...view, level };
    }),
    solution: solution.state === "opened" ? { ...solution, files: ctx.solution } : solution,
    explanation:
      explanation.state === "opened" && ctx.explanation !== null
        ? { ...explanation, markdown: ctx.explanation }
        : explanation,
    autoOpen: access.autoOpen.filter((item) =>
      item === "solution" ? ctx.solution.length > 0 : ctx.explanation !== null,
    ),
    latestSubmission: ctx.latestSubmission,
  };
}

/** 今の解放の状態と、開いた素材の本文。読むだけで記録はしない。 */
export async function getTaskHelp(db: Db, caller: Caller, taskId: string) {
  return helpResponse(await loadHelpContext(db, caller, taskId));
}

/**
 * 素材 1 つ (ヒントは 1 段) を開く。解放条件を満たしていなければ 403 で何も返さない。
 * 記録してから返す (記録できなければ返さない)。同じ素材をもう一度開いても記録は最初の 1 回。
 */
export async function openTaskHelp(
  db: Db,
  caller: Caller,
  request: { taskId: string; item: HelpItem; level?: number },
): Promise<TaskHelpResponse> {
  const ctx = await loadHelpContext(db, caller, request.taskId);
  const availability = helpItemAvailability(accessOf(ctx), request.item, request.level);
  if (!availability.open)
    throw new ApiError(`まだ開けません: ${HELP_LOCK_LABELS[availability.reason]}`, 403);
  if (!ctx.privateHash) throw new ApiError("この課題には開ける素材がありません", 404);
  const level = request.item === "hint" ? (request.level ?? 0) : 0;
  if (!ctx.opens.some((o) => o.item === request.item && o.level === level)) {
    const open = { item: request.item, level, openedAt: new Date(), afterPass: ctx.passed };
    await db
      .insert(taskHelpOpens)
      .values({
        tenantId: caller.tenantId,
        userId: caller.id,
        taskId: ctx.task.id,
        contentHash: ctx.task.contentHash,
        privateHash: ctx.privateHash,
        ...open,
      })
      .onConflictDoNothing();
    ctx.opens.push(open);
  }
  return helpResponse(ctx);
}
