/**
 * 「講師に引き継ぐ」 (Issue #9 — 学習者 intake) の純ロジック。
 *
 * VS Code 拡張が採点失敗時に組み立てる POST ボディと、 API 側の upsert 判定を
 * ランタイム非依存で持つ。 拡張 / api / テストから同じ関数を使う。
 */

import type { GradingSummary, ReviewPriority } from "./types.js";

/** 提出コード全体の上限。 `MAX_REVIEW_CODE_LENGTH` (AI 下書き) と揃える。 */
export const MAX_ESCALATION_CODE_LENGTH = 80_000;

/** 詰まってのエスカレーションは講師に先に見てほしいので優先度を上げる。 */
export const ESCALATION_PRIORITY: ReviewPriority = "high";

export interface EscalationSubmissionBody {
  lessonId: string | null;
  assignmentId: string;
  courseTitle: string;
  sectionTitle: string | null;
  assignmentTitle: string;
  code: string;
  priority: ReviewPriority;
  attempt: number;
  gradingSummary: GradingSummary | null;
}

export interface EscalationInput {
  lessonId?: string | null;
  assignmentId: string;
  courseTitle: string;
  sectionTitle?: string | null;
  assignmentTitle: string;
  /** 演習フォルダの相対パス → 中身。 */
  files: Record<string, string>;
  /** 採点・実行の入口ファイル (先頭に並べる)。 */
  entryFile?: string;
  gradingSummary?: GradingSummary | null;
}

/**
 * 演習フォルダの複数ファイルを 1 本のテキストにまとめる。
 *
 * `submissions.code` は 1 列しかないので、 ファイル境界をコメント見出しで残す
 * (講師が読む前提。 再実行はしない)。 入口ファイルを先頭に、 残りはパス順。
 */
export function concatExerciseFiles(
  files: Record<string, string>,
  entryFile?: string,
  maxLength = MAX_ESCALATION_CODE_LENGTH,
): string {
  const paths = Object.keys(files).sort((a, b) => a.localeCompare(b));
  const ordered =
    entryFile && files[entryFile] !== undefined
      ? [entryFile, ...paths.filter((path) => path !== entryFile)]
      : paths;
  const blocks = ordered.map((path) => ({ path, content: files[path] ?? "" }));

  const [first] = blocks;
  if (!first) return "";
  if (blocks.length === 1) return clamp(first.content, maxLength);

  return clamp(
    blocks.map((block) => `// ===== ${block.path} =====\n${block.content}`).join("\n\n"),
    maxLength,
  );
}

/** 打ち切ったことを講師に見せる footer。 これも含めて `maxLength` に収める。 */
const TRUNCATED_FOOTER = "\n// ...(以降は文字数上限のため省略)";

/**
 * `maxLength` 以内に収める。 footer を足しても超えないよう、 footer のぶんを先に引く
 * (超えると AI 下書き `/api/review-draft` が同じ上限で 400 を返してしまう)。
 */
function clamp(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  // footer すら入らない上限では footer を諦める (実運用では起きないが不変条件は保つ)。
  if (maxLength <= TRUNCATED_FOOTER.length) return text.slice(0, Math.max(0, maxLength));
  return `${text.slice(0, maxLength - TRUNCATED_FOOTER.length)}${TRUNCATED_FOOTER}`;
}

/** POST /api/submissions のボディを組み立てる。 attempt はサーバが確定するので 1 を送る。 */
export function buildEscalationSubmissionBody(input: EscalationInput): EscalationSubmissionBody {
  return {
    lessonId: input.lessonId ?? null,
    assignmentId: input.assignmentId,
    courseTitle: input.courseTitle,
    sectionTitle: input.sectionTitle ?? null,
    assignmentTitle: input.assignmentTitle,
    code: concatExerciseFiles(input.files, input.entryFile),
    priority: ESCALATION_PRIORITY,
    attempt: 1,
    gradingSummary: input.gradingSummary ?? null,
  };
}

/** attempt を決めるのに必要な既存提出の最小形。 */
export interface PreviousSubmission {
  attempt: number;
}

/**
 * 新しい行を作るときの `attempt`。
 *
 * 未添削 (pending) が残っている場合の上書きは 1 本の UPDATE で
 * `attempt = attempt + 1` するので、 ここは通らない (API 側の原子性のため)。
 *
 * - 過去提出があれば `attempt + 1` (添削済みからの再提出)
 * - 無ければ要求値 (既定 1)
 */
export function nextSubmissionAttempt(
  previous: PreviousSubmission | null | undefined,
  requestedAttempt?: number,
): number {
  if (!previous) return normalizeAttempt(requestedAttempt);
  return normalizeAttempt(previous.attempt) + 1;
}

function normalizeAttempt(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  const floored = Math.floor(value);
  return floored < 1 ? 1 : floored;
}
