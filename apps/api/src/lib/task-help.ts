/**
 * ヒント・解答例・解説を、解放条件 (07 §8) を満たした受講者にだけ返す (#36)。
 *
 * - 判定は `@stella/shared/tasks/help` の `taskHelpAccess` (拡張と同じ表) をサーバーで当てる。
 *   拡張・Web の表示制御だけに頼らない。
 * - 本文は受講者の手元の版 (配布記録の contentHash) の素材から読む。今の版なら `task_private`、
 *   前の版なら、その版を配っていたときの素材の版 (`task_revisions.private_hash` →
 *   `task_private_versions`)。素材の版が分からない版 (知らない版・記録する前の版) には素材を出さず、
 *   受け取り直しを案内する。判定は今の版の表で行い、前の版ならその版の表とも重ねる (緩くしない)。
 * - 返すのはヒント (`hints.md` の段)・解答例 (`solution/`)・解説 (`explanation.md`) だけで、
 *   予備の類題 (`variants/`) とレビューの観点 (`review.md`) はどの条件でも返さない。
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
  intersectHelpAccess,
  parseTaskHints,
  staleHelpAccess,
  supportConfigOf,
  type TaskHelpAccess,
  type TaskHelpResponse,
  type TaskHint,
  type TaskSupportConfig,
  taskHelpAccess,
} from "@stella/shared/tasks/help";
import { TASK_KINDS, type TaskKind } from "@stella/shared/tasks/manifest";
import type { SupportEvent } from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import {
  sections,
  submissions,
  taskHelpOpens,
  taskLocalRuns,
  taskPrivate,
  taskPrivateVersions,
  taskProgress,
  taskRevisions,
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

/** 開いた記録 1 件。出した版 (課題の版と素材の版) を持つ。 */
interface RecordedOpen extends HelpOpen {
  contentHash: string;
  privateHash: string;
}

/**
 * 開いた記録を、提出の支援記録の形にまとめる。ヒントは最初に開いた時刻で 1 件 (detail に開いた
 * 最も深い段)、解答例・解説はそれぞれ最初の 1 件 (版を変えて開き直した分は重ねない)。
 * `opens` は時刻の古い順。
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

/** 受講者に出す版。素材 (ヒント・解答例・解説) はこの版のものだけを返す。 */
interface ServedVersion {
  contentHash: string;
  privateHash: string;
  kind: TaskKind;
  support: TaskSupportConfig;
  hints: TaskHint[];
  solution: HelpSolutionFile[];
  explanation: string | null;
}

/** 解放の判定と本文に要るもの。どれもサーバーの記録から読む (受講者の申告は使わない)。 */
interface HelpContext {
  /** 今の版の課題。判定は今の版の表で行う。 */
  task: { id: string; title: string; kind: TaskKind; contentHash: string };
  support: TaskSupportConfig;
  /** 出す版。素材の版が分からない (知らない版・記録する前の版) なら null で、素材を出さない。 */
  served: ServedVersion | null;
  status: TaskStatus;
  passed: boolean;
  /** 開いた記録 (版を問わない。時刻の古い順)。 */
  opens: RecordedOpen[];
  attempts: number;
  latestSubmission: { id: string; attempt: number } | null;
}

const PASSED: readonly TaskStatus[] = ["passed", "ai-passed"];

/**
 * 素材の版 (task_private と同じ形の JSON) を、出す素材に分ける。`hints.md` を段に分けられない
 * 素材は、ヒントを出さず解答例も合格後だけにする (いちばん厳しい側)。本文はログに出さない。
 */
async function servedVersion(
  taskId: string,
  version: { contentHash: string; kind: TaskKind; definition: unknown; filesJson: string },
): Promise<ServedVersion> {
  const files = JSON.parse(version.filesJson) as Record<string, string>;
  let support = supportConfigOf(version.definition);
  let hints: TaskHint[] = [];
  const parsed =
    files["hints.md"] !== undefined ? parseTaskHints(decodeBase64(files["hints.md"])) : null;
  if (parsed?.ok) {
    hints = parsed.hints;
    // 段に分けられたヒントより多くは数えない (開けない段を待たせない)。
    support = { ...support, hintLevels: Math.min(support.hintLevels, hints.length) };
  } else {
    // 教材の検査で止めている形の誤り。
    if (parsed) console.warn("[task-help] hints.md を段に分けられません", taskId);
    support = { hintLevels: 0, solutionUnlock: "passed" };
  }
  return {
    contentHash: version.contentHash,
    privateHash: await sha256Hex(version.filesJson),
    kind: version.kind,
    support,
    hints,
    solution: Object.entries(files)
      .filter(([path]) => path.startsWith("solution/") && !path.endsWith("/.gitkeep"))
      .map(([path, content]) => ({ path: path.slice("solution/".length), content })),
    explanation: files["explanation.md"] ? decodeBase64(files["explanation.md"]) : null,
  };
}

/** 配布物の manifest から、その版の種別を読む。読めなければ null (今の版の種別だけで判定する)。 */
function kindOfBundle(bundle: string): TaskKind | null {
  const parsed = JSON.parse(bundle) as { manifest?: { kind?: unknown } };
  const kind = parsed.manifest?.kind;
  return typeof kind === "string" && (TASK_KINDS as readonly string[]).includes(kind)
    ? (kind as TaskKind)
    : null;
}

/**
 * 受講者の手元の版の素材を読む。今の版ならそのまま、前の版ならその版を配っていたときの素材の版を
 * 読む。素材の版が分からなければ null (素材を出さない)。
 *
 * 版を送らない呼び出し (`contentHash` 無し) は今の版として扱う。この API と課題パネルは同時に
 * 入ったので、版を送らない拡張は無い。手で呼んだ場合も、今 `/api/tasks/bundle` が配る版の素材を
 * 今の判定で出すだけで、新しく配布を受けたときに見られる範囲を超えない。
 */
async function loadServed(
  db: Db,
  row: {
    id: string;
    kind: TaskKind;
    contentHash: string;
    definition: string;
    privateFiles: string | null;
  },
  contentHash: string | undefined,
): Promise<ServedVersion | null> {
  if (contentHash === undefined || contentHash === row.contentHash)
    // 非公開の素材が無い課題は、開けるものの無い版として扱う (どの素材も「表示しません」)。
    return servedVersion(row.id, {
      contentHash: row.contentHash,
      kind: row.kind,
      definition: JSON.parse(row.definition),
      filesJson: row.privateFiles ?? "{}",
    });
  const [revision] = await db
    .select({
      definition: taskRevisions.definition,
      bundle: taskRevisions.bundle,
      privateHash: taskRevisions.privateHash,
    })
    .from(taskRevisions)
    .where(and(eq(taskRevisions.taskId, row.id), eq(taskRevisions.contentHash, contentHash)))
    .limit(1);
  if (!revision?.privateHash) return null;
  const [material] = await db
    .select({ files: taskPrivateVersions.files })
    .from(taskPrivateVersions)
    .where(
      and(
        eq(taskPrivateVersions.taskId, row.id),
        eq(taskPrivateVersions.privateHash, revision.privateHash),
      ),
    )
    .limit(1);
  if (!material) return null;
  return servedVersion(row.id, {
    contentHash,
    // 種別が読めない版は今の版の種別で重ねる (緩くはならない)。
    kind: kindOfBundle(revision.bundle) ?? row.kind,
    definition: JSON.parse(revision.definition),
    filesJson: material.files,
  });
}

/**
 * 受講者が読める課題 (`canAccessTasks`: 同じテナントの公開中の format 2 で、受講中か修了) の
 * 解放の判定に要るものを集める。読めない課題は 404 (課題があるかどうかも返さない)。
 */
async function loadHelpContext(
  db: Db,
  caller: Caller,
  taskId: string,
  contentHash: string | undefined,
): Promise<HelpContext> {
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
  const kind = row.kind as TaskKind;
  const scope = { tenantId: caller.tenantId, userId: caller.id, taskId: row.id };
  const [[progress], [runs], [submitted], [latest], opens, served] = await Promise.all([
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
      // 同じ時刻の提出は試行の番号で決める (提出の処理はロックの中で attempt を振る)。
      .orderBy(desc(submissions.submittedAt), desc(submissions.attempt))
      .limit(1),
    db
      .select({
        item: taskHelpOpens.item,
        level: taskHelpOpens.level,
        openedAt: taskHelpOpens.openedAt,
        afterPass: taskHelpOpens.afterPass,
        contentHash: taskHelpOpens.contentHash,
        privateHash: taskHelpOpens.privateHash,
      })
      .from(taskHelpOpens)
      .where(helpOpensOf(scope))
      .orderBy(asc(taskHelpOpens.openedAt)),
    loadServed(db, { ...row, kind }, contentHash),
  ]);
  // 一覧 (`/api/tasks/for-stage`) と同じく、合格は版が変わっても合格のまま。
  const passed = progress !== undefined && PASSED.includes(progress.status);
  const status: TaskStatus =
    progress && (progress.contentHash === row.contentHash || passed)
      ? progress.status
      : "not-started";
  // 今の版の表。出す版が今の版なら、段の数は出す素材に合わせる。
  const current = supportConfigOf(JSON.parse(row.definition));
  const support =
    served?.contentHash === row.contentHash
      ? served.support
      : { ...current, hintLevels: Math.min(current.hintLevels, served?.hints.length ?? Infinity) };
  return {
    task: { id: row.id, title: row.title, kind, contentHash: row.contentHash },
    support,
    served,
    status,
    passed,
    opens,
    attempts: countHelpAttempts({
      failedLocalRuns: runs?.failed ?? 0,
      submissions: submitted?.n ?? 0,
    }),
    latestSubmission: latest ?? null,
  };
}

const NOT_OFFERED: HelpAvailability = { open: false, reason: "not-offered" };

/**
 * 表の判定 (今の版。前の版を出すならその版の表とも重ねる) に、素材が無いこと (解答例のファイルや
 * 解説が無い) と、出す版の素材が分からないことを重ねる。
 */
function accessOf(ctx: HelpContext): TaskHelpAccess {
  const facts = {
    passed: ctx.passed,
    attempts: ctx.attempts,
    openedHintLevel: Math.max(0, ...ctx.opens.filter((o) => o.item === "hint").map((o) => o.level)),
  };
  const current = taskHelpAccess({ ...facts, kind: ctx.task.kind, support: ctx.support });
  const { served } = ctx;
  if (!served) return staleHelpAccess(current);
  const access =
    served.contentHash === ctx.task.contentHash
      ? current
      : intersectHelpAccess(
          current,
          taskHelpAccess({ ...facts, kind: served.kind, support: served.support }),
        );
  return {
    ...access,
    solution: served.solution.length > 0 ? access.solution : NOT_OFFERED,
    explanation: served.explanation !== null ? access.explanation : NOT_OFFERED,
    autoOpen: access.autoOpen.filter((item) =>
      item === "solution" ? served.solution.length > 0 : served.explanation !== null,
    ),
  };
}

function viewOf(availability: HelpAvailability, opened: boolean): HelpItemView {
  if (!availability.open) return { state: "locked", reason: availability.reason };
  return opened ? { state: "opened" } : { state: "available" };
}

/** 出す版で開いた記録があるか。前の版で開いた素材は、出す版で開き直して記録してから本文を返す。 */
function openedIn(ctx: HelpContext, item: HelpItem, level = 0): boolean {
  const { served } = ctx;
  return (
    served !== null &&
    ctx.opens.some(
      (o) =>
        o.item === item &&
        o.level === level &&
        o.contentHash === served.contentHash &&
        o.privateHash === served.privateHash,
    )
  );
}

/**
 * 応答を組み立てる。本文は「出す版で開いた記録があり、今も開ける」素材だけに付ける。まだ開いて
 * いない素材は状態だけを返し、ヒントの題も開くまでは返さない (題が答えを示しうるため)。
 */
function helpResponse(ctx: HelpContext): TaskHelpResponse {
  const access = accessOf(ctx);
  const served = ctx.served;
  const solution = viewOf(access.solution, openedIn(ctx, "solution"));
  const explanation = viewOf(access.explanation, openedIn(ctx, "explanation"));
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
      const view = viewOf(availability, openedIn(ctx, "hint", level));
      const hint = served?.hints[i];
      return view.state === "opened" && hint
        ? { ...view, level, title: hint.title, markdown: hint.markdown }
        : { ...view, level };
    }),
    solution:
      solution.state === "opened" && served ? { ...solution, files: served.solution } : solution,
    explanation:
      explanation.state === "opened" && served?.explanation
        ? { ...explanation, markdown: served.explanation }
        : explanation,
    autoOpen: access.autoOpen,
    latestSubmission: ctx.latestSubmission,
  };
}

/** 今の解放の状態と、開いた素材の本文。読むだけで記録はしない。 */
export async function getTaskHelp(
  db: Db,
  caller: Caller,
  taskId: string,
  contentHash?: string,
): Promise<TaskHelpResponse> {
  return helpResponse(await loadHelpContext(db, caller, taskId, contentHash));
}

/**
 * 素材 1 つ (ヒントは 1 段) を開く。解放条件を満たしていなければ 403、手元の版の素材が分からなければ
 * 409 で、何も返さない。出した版で記録してから返す (記録できなければ返さない)。同じ版の同じ素材を
 * もう一度開いても記録は最初の 1 回。
 */
export async function openTaskHelp(
  db: Db,
  caller: Caller,
  request: { taskId: string; item: HelpItem; level?: number; contentHash?: string },
): Promise<TaskHelpResponse> {
  const ctx = await loadHelpContext(db, caller, request.taskId, request.contentHash);
  const availability = helpItemAvailability(accessOf(ctx), request.item, request.level);
  if (!availability.open)
    throw availability.reason === "stale-version"
      ? new ApiError(HELP_LOCK_LABELS["stale-version"], 409)
      : new ApiError(`まだ開けません: ${HELP_LOCK_LABELS[availability.reason]}`, 403);
  const { served } = ctx;
  if (!served) throw new ApiError(HELP_LOCK_LABELS["stale-version"], 409);
  const level = request.item === "hint" ? (request.level ?? 0) : 0;
  if (!openedIn(ctx, request.item, level)) {
    const open = {
      item: request.item,
      level,
      openedAt: new Date(),
      afterPass: ctx.passed,
      contentHash: served.contentHash,
      privateHash: served.privateHash,
    };
    await db
      .insert(taskHelpOpens)
      .values({ tenantId: caller.tenantId, userId: caller.id, taskId: ctx.task.id, ...open })
      .onConflictDoNothing();
    ctx.opens.push(open);
  }
  return helpResponse(ctx);
}
