/**
 * 課題のヒント・解答例・解説を「出す順番」(07 §8)。
 *
 * 解答を隠すのではなく、種別ごとに開ける順番と時期を決める。練習で行き詰まらせないことと、
 * 自力で確かめた結果を正しく残すことを両立させるためである。判定はこの純粋関数 1 つにまとめ、
 * API (受講者へ返すかの判定) と拡張 (課題パネルの表示) が同じ表を使う。拡張の表示だけに頼らず、
 * 素材を返すかどうかは必ずサーバーがこの表で決める。
 *
 * | 種別 | 取り組み中 | 合格後 |
 * | 基礎・接続 | ヒントを段階的に開ける (方針 → 手がかりのコード → 解答例) | 解答例と解説を自動で開く |
 * | 自力・修正 | ヒントは開ける。解答例は一定回数の挑戦のあとか、合格後 | 解答例・別解と、選び方の理由 (解説) |
 * | 統合 | 仕様・状態見本・API 契約へのリンクだけ | レビューの所見と解答例 |
 * | 確認A・B | 公式ドキュメントと文法の参照だけ。ヒントと解答は表示しない | 所見。確認Aの解答例は合格の判定のあと |
 *
 * 予備の類題 (`private/variants/`) はここに載せない。出題の仕組み (#39) ができるまで、
 * どの条件でも受講者へ返さない。レビューの観点 (`private/review.md`) も受講者へは返さない。
 */

import type { TaskStatus } from "./catalog.js";
import type { TaskKind } from "./manifest.js";

/**
 * 取り組み中に解答例を開ける条件 (教材の `task.json` の `support.solutionUnlock`)。
 * - `after-hints`: ヒントを最後まで開いた次の段で開く (基礎・接続の既定)
 * - `attempts-or-passed`: 決まった回数の挑戦のあとか、合格後 (自力・修正)
 * - `passed`: 合格後だけ
 */
export const SOLUTION_UNLOCKS = ["after-hints", "attempts-or-passed", "passed"] as const;
export type SolutionUnlock = (typeof SOLUTION_UNLOCKS)[number];

/**
 * 自力・修正で、合格前に解答例を開けるまでの挑戦の回数の既定。教材の `support.attempts` で
 * 課題ごとに変えられる。07 に回数の定めが無いので、つまずきの検知 (同じ版で 5 回続けて失敗、
 * 07 §6.5.1) と同じ 5 回にそろえた。
 *
 * 1 回の挑戦として数えるのは次の 2 つ (`countHelpAttempts`)。
 * - 手元の確認で失敗した 1 回 (`task_local_runs.failed_runs`)。環境のエラーと中断は数えない。
 * - その課題の提出 1 回 (講師への相談を含む。判定の結果は問わない)。
 */
export const SOLUTION_UNLOCK_ATTEMPTS = 5;

/** 挑戦の回数。手元の確認の失敗と、提出 (相談を含む) の試行を足す。 */
export function countHelpAttempts(input: { failedLocalRuns: number; submissions: number }): number {
  return Math.max(0, input.failedLocalRuns) + Math.max(0, input.submissions);
}

/** 教材の `support` のうち、解放の判定に使う部分。 */
export interface TaskSupportConfig {
  hintLevels: number;
  solutionUnlock: SolutionUnlock;
  /** `attempts-or-passed` の回数。省略すると `SOLUTION_UNLOCK_ATTEMPTS`。 */
  attempts?: number;
}

/** 合格後に開ける素材。 */
export type AfterPassMaterial = "solution" | "explanation";

export interface TaskHelpPolicy {
  /** 取り組み中にヒントを開けるか (統合・確認A・Bは開けない。教材のヒントは 0 段にする)。 */
  hints: boolean;
  /** 教材が選べる、取り組み中の解答例の条件。先頭がその種別の既定。 */
  solutionUnlocks: readonly SolutionUnlock[];
  /** 合格後に開けるもの。 */
  afterPass: readonly AfterPassMaterial[];
  /** 合格後に、受講者が押さなくても開くか。 */
  autoOpenAfterPass: boolean;
  /** 取り組み中に、課題パネルへ出す案内 (参照元だけを使う種別)。 */
  workingNotice: string | null;
}

/** 種別ごとの解放の方針 (07 §8 の表)。 */
export const TASK_HELP_POLICIES: Readonly<Record<TaskKind, TaskHelpPolicy>> = {
  basic: {
    hints: true,
    solutionUnlocks: ["after-hints", "passed"],
    afterPass: ["solution", "explanation"],
    autoOpenAfterPass: true,
    workingNotice: null,
  },
  connection: {
    hints: true,
    solutionUnlocks: ["after-hints", "passed"],
    afterPass: ["solution", "explanation"],
    autoOpenAfterPass: true,
    workingNotice: null,
  },
  independent: {
    hints: true,
    solutionUnlocks: ["attempts-or-passed", "passed"],
    afterPass: ["solution", "explanation"],
    autoOpenAfterPass: false,
    workingNotice: null,
  },
  debug: {
    hints: true,
    solutionUnlocks: ["attempts-or-passed", "passed"],
    afterPass: ["solution", "explanation"],
    autoOpenAfterPass: false,
    workingNotice: null,
  },
  integration: {
    hints: false,
    solutionUnlocks: ["passed"],
    afterPass: ["solution"],
    autoOpenAfterPass: false,
    workingNotice:
      "統合課題では、取り組み中は仕様・状態見本・API 契約 (課題文と参照元) だけを使います。合格後に、レビューの所見と解答例を見られます。",
  },
  "assessment-a": {
    hints: false,
    solutionUnlocks: ["passed"],
    afterPass: ["solution"],
    autoOpenAfterPass: false,
    workingNotice:
      "確認Aでは、公式ドキュメントと文法の参照だけを使います。ヒントと解答は表示しません。合格の判定が出たあとに、所見と解答例を見られます。",
  },
  "assessment-b": {
    hints: false,
    solutionUnlocks: ["passed"],
    afterPass: [],
    autoOpenAfterPass: false,
    workingNotice:
      "確認Bでは、公式ドキュメントと文法の参照だけを使います。ヒントと解答は表示しません。判定のあとは所見を見られます。",
  },
};

/** 開けない理由。 */
export const HELP_LOCK_REASONS = [
  "previous-hint",
  "hints-first",
  "attempts",
  "passed",
  "not-offered",
  "stale-version",
] as const;
export type HelpLockReason = (typeof HELP_LOCK_REASONS)[number];

export const HELP_LOCK_LABELS: Readonly<Record<HelpLockReason, string>> = {
  "previous-hint": "前の段のヒントを開くと開けます",
  "hints-first": "ヒントを最後まで開くと開けます",
  attempts: "決まった回数の挑戦のあとか、合格後に開けます",
  passed: "合格後に開けます",
  "not-offered": "この種別の課題では表示しません",
  // 受講者の手元の版に対応する素材の版が分からない (知らない版・素材の版を記録する前の版)。
  "stale-version": "手元の課題が古い版です。最新を受け取り直すと開けます",
};

export type HelpAvailability = { open: true } | { open: false; reason: HelpLockReason };

/** 判定に使う事実。どれもサーバーが記録から数えた値を渡す (受講者の申告は使わない)。 */
export interface TaskHelpFacts {
  kind: TaskKind;
  support: TaskSupportConfig;
  /** 合格 (AI か人) の判定がある。 */
  passed: boolean;
  /** 挑戦の回数 (`countHelpAttempts`)。 */
  attempts: number;
  /** 開いたヒントの最も深い段 (0 = まだ開いていない)。 */
  openedHintLevel: number;
}

export interface TaskHelpAccess {
  phase: "working" | "passed";
  /** 取り組み中に、課題文と参照元だけを使う種別か (統合・確認A・B)。 */
  referencesOnly: boolean;
  notice: string | null;
  /** ヒントの段ごとの可否 (添字 0 が 1 段目)。 */
  hints: HelpAvailability[];
  solution: HelpAvailability;
  explanation: HelpAvailability;
  /** 合格後に自動で開くもの。 */
  autoOpen: AfterPassMaterial[];
  /** 挑戦の回数で解答例を開く課題の、取り組み中の回数。それ以外は null。 */
  attempts: { count: number; required: number } | null;
}

const OPEN: HelpAvailability = { open: true };
const locked = (reason: HelpLockReason): HelpAvailability => ({ open: false, reason });

/** 教材が種別の方針に無い条件を書いていたら (古い seed など)、いちばん厳しい「合格後」にする。 */
function effectiveUnlock(policy: TaskHelpPolicy, unlock: SolutionUnlock): SolutionUnlock {
  return policy.solutionUnlocks.includes(unlock) ? unlock : "passed";
}

/** ヒントは 1 段ずつ開く。種別がヒントを持たなければ 0 段として扱う。 */
export function effectiveHintLevels(kind: TaskKind, support: TaskSupportConfig): number {
  return TASK_HELP_POLICIES[kind].hints ? Math.max(0, Math.floor(support.hintLevels)) : 0;
}

/** 種別・合格・挑戦の回数・開いたヒントから、今開けるものを決める (07 §8)。 */
export function taskHelpAccess(facts: TaskHelpFacts): TaskHelpAccess {
  const policy = TASK_HELP_POLICIES[facts.kind];
  const unlock = effectiveUnlock(policy, facts.support.solutionUnlock);
  const hintLevels = effectiveHintLevels(facts.kind, facts.support);
  const opened = Math.max(0, facts.openedHintLevel);
  const hints = Array.from({ length: hintLevels }, (_, i) =>
    i + 1 <= opened + 1 ? OPEN : locked("previous-hint"),
  );
  const required = facts.support.attempts ?? SOLUTION_UNLOCK_ATTEMPTS;
  if (facts.passed) {
    return {
      phase: "passed",
      referencesOnly: false,
      notice: null,
      hints,
      solution: policy.afterPass.includes("solution") ? OPEN : locked("not-offered"),
      explanation: policy.afterPass.includes("explanation") ? OPEN : locked("not-offered"),
      autoOpen: policy.autoOpenAfterPass ? [...policy.afterPass] : [],
      attempts: null,
    };
  }
  const solution: HelpAvailability = !policy.afterPass.includes("solution")
    ? locked("not-offered")
    : unlock === "after-hints"
      ? opened >= hintLevels
        ? OPEN
        : locked("hints-first")
      : unlock === "attempts-or-passed"
        ? facts.attempts >= required
          ? OPEN
          : locked("attempts")
        : locked("passed");
  return {
    phase: "working",
    referencesOnly: !policy.hints,
    notice: policy.workingNotice,
    hints,
    solution,
    explanation: policy.afterPass.includes("explanation")
      ? locked("passed")
      : locked("not-offered"),
    autoOpen: [],
    attempts:
      unlock === "attempts-or-passed" ? { count: Math.max(0, facts.attempts), required } : null,
  };
}

function both(a: HelpAvailability, b: HelpAvailability): HelpAvailability {
  if (!a.open) return a;
  return b;
}

/**
 * 2 つの判定の両方で開けるものだけを開けるとする。受講者の手元の版が今の版と違うとき、今の版の
 * 判定と手元の版の判定を重ね、どちらかより緩くならないようにする (種別が版で変わった課題など)。
 */
export function intersectHelpAccess(a: TaskHelpAccess, b: TaskHelpAccess): TaskHelpAccess {
  const levels = Math.min(a.hints.length, b.hints.length);
  return {
    phase: a.phase,
    referencesOnly: a.referencesOnly || b.referencesOnly,
    notice: a.notice ?? b.notice,
    hints: Array.from({ length: levels }, (_, i) => both(a.hints[i], b.hints[i])),
    solution: both(a.solution, b.solution),
    explanation: both(a.explanation, b.explanation),
    autoOpen: a.autoOpen.filter((item) => b.autoOpen.includes(item)),
    attempts: a.attempts,
  };
}

/** 素材を出せないとき (手元の版の素材が分からない) の判定。ヒントの段の数だけは見せる。 */
export function staleHelpAccess(access: TaskHelpAccess): TaskHelpAccess {
  const stale: HelpAvailability = { open: false, reason: "stale-version" };
  return {
    ...access,
    hints: access.hints.map(() => stale),
    solution: stale,
    explanation: stale,
    autoOpen: [],
  };
}

/** 課題の版 (配布記録の contentHash) の形。 */
export const HELP_CONTENT_HASH = /^[a-f0-9]{64}$/;

/** 開いた記録に残す素材の種類。予備の類題・レビューの観点はここに無い (受講者へ返さない)。 */
export const HELP_ITEMS = ["hint", "solution", "explanation"] as const;
export type HelpItem = (typeof HELP_ITEMS)[number];

export const HELP_ITEM_LABELS: Readonly<Record<HelpItem, string>> = {
  hint: "ヒント",
  solution: "解答例",
  explanation: "解説",
};

/** 素材 1 つ (ヒントは段も) が今開けるか。サーバーが返す前と、記録する前に使う。 */
export function helpItemAvailability(
  access: TaskHelpAccess,
  item: HelpItem,
  level?: number,
): HelpAvailability {
  if (item === "hint") {
    const step = level === undefined ? undefined : access.hints[level - 1];
    return step ?? locked("not-offered");
  }
  return item === "solution" ? access.solution : access.explanation;
}

/**
 * 支援の記録 (`SupportEvent.kind`) での種類。ヒントは「解法のヒント」、解答例と解説は
 * 「解答の表示」として数える (解説は解き方を示すため)。
 */
export function helpSupportKind(item: HelpItem): "hint" | "solution" {
  return item === "hint" ? "hint" : "solution";
}

/** 開いた記録 1 件の表示 (支援の記録の detail に使う)。 */
export function helpOpenDetail(open: {
  item: HelpItem;
  level: number;
  afterPass: boolean;
}): string {
  const what = open.item === "hint" ? `ヒント ${open.level} 段目` : HELP_ITEM_LABELS[open.item];
  return `${what}を開いた${open.afterPass ? " (合格後)" : ""}`;
}

// ---------------------------------------------------------------
// hints.md の形
// ---------------------------------------------------------------

/**
 * 段の見出し。`## ヒント1` の後ろに、空白を挟んで段の題 (方針・手がかりのコードなど) を書ける。
 * 解答例は hints.md に書かない (`private/solution/` が最後の段になる)。
 */
const HINT_HEADING = /^##[ \t]+ヒント[ \t]*(\d+)(?:[ \t　]+(\S.*?))?[ \t]*$/;

export interface TaskHint {
  level: number;
  /** 段の題。書いていなければ `ヒント<番号>`。 */
  title: string;
  markdown: string;
}

export type ParseTaskHintsResult =
  | { ok: true; hints: TaskHint[] }
  | { ok: false; errors: string[] };

/**
 * `hints.md` を段に分ける。段は `## ヒント<番号> <題>` の見出しで始め、番号は 1 から順に振る。
 * 最初の見出しより前に本文は置けない。段の中では `###` 以下の見出しとコードブロックを使える
 * (コードブロックの中の `##` は見出しとして扱わない)。ヒント 0 段の課題では、本文の無い
 * (空かコメントだけの) hints.md にする。
 */
export function parseTaskHints(markdown: string): ParseTaskHintsResult {
  const errors: string[] = [];
  const hints: TaskHint[] = [];
  let current: { level: number; title: string; lines: string[] } | null = null;
  let fence: string | null = null;
  let preamble = false;
  const lines = markdown.replace(/^﻿/, "").split(/\r?\n/);
  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (!stripComments(body)) errors.push(`hints.md: ヒント${current.level} の本文がありません`);
    hints.push({ level: current.level, title: current.title, markdown: body });
  };
  for (const [index, line] of lines.entries()) {
    const marker = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      current?.lines.push(line);
      continue;
    }
    if (marker) {
      fence = marker;
      if (current) current.lines.push(line);
      else preamble = true;
      continue;
    }
    if (/^#{1,2}(?:[ \t]|$)/.test(line)) {
      const heading = HINT_HEADING.exec(line);
      if (!heading) {
        errors.push(
          `hints.md ${index + 1} 行目: 見出しは「## ヒント<番号> <題>」で書いてください (段の中の見出しは ### 以下)`,
        );
        continue;
      }
      flush();
      const level = Number(heading[1]);
      if (level !== hints.length + 1)
        errors.push(`hints.md ${index + 1} 行目: ヒントの番号は 1 から順に振ってください`);
      current = { level, title: heading[2]?.trim() || `ヒント${level}`, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else if (stripComments(line).trim()) preamble = true;
  }
  flush();
  if (fence) errors.push("hints.md: コードブロックが閉じていません");
  if (preamble) errors.push("hints.md: 最初の「## ヒント1」より前に本文を書けません");
  return errors.length > 0 ? { ok: false, errors } : { ok: true, hints };
}

function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "").trim();
}

// ---------------------------------------------------------------
// API の応答
// ---------------------------------------------------------------

export type HelpItemView =
  | { state: "opened" }
  | { state: "available" }
  | { state: "locked"; reason: HelpLockReason };

/** 解答例のファイル。`content` は base64 (配布物と同じ)。 */
export interface HelpSolutionFile {
  path: string;
  content: string;
}

/**
 * `GET /api/tasks/help` と `POST /api/tasks/help/open` の応答。本文 (`markdown`・`files`) は、
 * 受講者が開いた記録があり、今も開ける素材だけに付く。まだ開いていない素材は状態だけを返す。
 */
export interface TaskHelpResponse {
  taskId: string;
  title: string;
  kind: TaskKind;
  status: TaskStatus;
  phase: "working" | "passed";
  referencesOnly: boolean;
  notice: string | null;
  attempts: { count: number; required: number } | null;
  hints: (HelpItemView & { level: number; title?: string; markdown?: string })[];
  solution: HelpItemView & { files?: HelpSolutionFile[] };
  explanation: HelpItemView & { markdown?: string };
  autoOpen: AfterPassMaterial[];
  /** この課題の最新の提出。レビューの結果は `GET /api/submissions/:id` で読む。 */
  latestSubmission: { id: string; attempt: number } | null;
}

/** `POST /api/tasks/help/open` の本文を検証する。 */
export function parseHelpOpenRequest(raw: unknown): {
  taskId: string;
  item: HelpItem;
  level?: number;
  contentHash?: string;
} {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error("本文はオブジェクトで送ってください");
  const body = raw as Record<string, unknown>;
  if (typeof body.taskId !== "string" || !body.taskId) throw new Error("taskId が必要です");
  if (typeof body.item !== "string" || !(HELP_ITEMS as readonly string[]).includes(body.item))
    throw new Error(`item は ${HELP_ITEMS.join(" / ")} のどれかにしてください`);
  const item = body.item as HelpItem;
  const contentHash = parseHelpContentHash(body.contentHash);
  const version = contentHash === undefined ? {} : { contentHash };
  if (item !== "hint") return { taskId: body.taskId, item, ...version };
  if (
    typeof body.level !== "number" ||
    !Number.isInteger(body.level) ||
    body.level < 1 ||
    body.level > 50
  )
    throw new Error("level は 1 以上の整数で送ってください");
  return { taskId: body.taskId, item, level: body.level, ...version };
}

/**
 * 受講者の手元の版 (配布記録の contentHash)。省略できる (省略すると今の版として扱う)。
 * 送るなら SHA-256 の 16 進 64 文字に限る。
 */
export function parseHelpContentHash(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string" || !HELP_CONTENT_HASH.test(raw))
    throw new Error("contentHash は課題の版 (16 進 64 文字) で送ってください");
  return raw;
}

/** D1 の課題の定義 (教材の task.json) から `support` を読む。読めなければ最も厳しい設定。 */
export function supportConfigOf(definition: unknown): TaskSupportConfig {
  const support =
    typeof definition === "object" && definition !== null && "support" in definition
      ? (definition as { support?: unknown }).support
      : undefined;
  if (typeof support !== "object" || support === null)
    return { hintLevels: 0, solutionUnlock: "passed" };
  const raw = support as Record<string, unknown>;
  const hintLevels =
    typeof raw.hintLevels === "number" && Number.isInteger(raw.hintLevels) && raw.hintLevels > 0
      ? raw.hintLevels
      : 0;
  const solutionUnlock = (SOLUTION_UNLOCKS as readonly unknown[]).includes(raw.solutionUnlock)
    ? (raw.solutionUnlock as SolutionUnlock)
    : "passed";
  const attempts =
    typeof raw.attempts === "number" && Number.isInteger(raw.attempts) && raw.attempts > 0
      ? raw.attempts
      : undefined;
  return { hintLevels, solutionUnlock, ...(attempts === undefined ? {} : { attempts }) };
}
