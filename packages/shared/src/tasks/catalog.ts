import {
  isSafeRelativePattern,
  parseTaskManifest,
  type TaskKind,
  type TaskManifest,
} from "./manifest.js";

export const TASK_STATUSES = [
  "not-started",
  "local-passed",
  "submitted",
  "ai-passed",
  "instructor-pending",
  "resubmit",
  "passed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  "not-started": "未着手",
  "local-passed": "手元で合格",
  submitted: "提出済み",
  "ai-passed": "AI で合格",
  "instructor-pending": "講師の確認待ち",
  resubmit: "再提出",
  passed: "合格",
};
export interface TaskSummary {
  id: string;
  sectionId: string;
  title: string;
  kind: TaskKind;
  pattern: string;
  skills: { uses: string[]; assesses: string[] };
  estimatedMinutes: number;
  status: TaskStatus;
  /** 課題文のレッスン (`lessons.id`)。そのレッスンにも「VS Code で開く」を出す。 */
  lessonId: string | null;
}
/** 公開用の明示的なファイル一覧。private とレビュー用の素材はここに載せない。 */
export interface TaskBundle {
  manifest: TaskManifest;
  contentHash: string;
  files: Record<string, string>;
}

/** `GET /api/tasks/bundle` の応答。`fixedStart` はこの版に固定した開始点があるか。 */
export interface TaskBundleResponse {
  bundle: TaskBundle;
  fixedStart: boolean;
}

/**
 * 配布一式 (通常の配布・固定した開始点) の大きさの上限。どちらも D1 の 1 行 (約 2MB) に
 * base64 の JSON で入り、Worker が 1 回の要求で丸ごと読む。base64 で 4/3 倍になっても
 * 1 行に収まり、拡張が配布ファイルのハッシュを取る上限 (10MB) より十分小さい大きさにする。
 */
export const TASK_BUNDLE_LIMITS = {
  fileBytes: 1024 * 1024,
  totalBytes: 1_200_000,
} as const;

function decodedBytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** 配布一式が上限を超えていれば理由を返す (教材の検査と API の両方で使う)。 */
export function bundleSizeProblem(files: Record<string, string>): string | undefined {
  let total = 0;
  for (const [path, encoded] of Object.entries(files)) {
    const bytes = decodedBytes(encoded);
    if (bytes > TASK_BUNDLE_LIMITS.fileBytes)
      return `${path} が大きすぎます (1 ファイル ${TASK_BUNDLE_LIMITS.fileBytes} バイトまで)`;
    total += bytes;
  }
  if (total > TASK_BUNDLE_LIMITS.totalBytes)
    return `配布ファイルの合計が大きすぎます (${total} バイト。${TASK_BUNDLE_LIMITS.totalBytes} バイトまで)`;
  return undefined;
}

/**
 * 固定した開始点を置くフォルダー名の接尾辞 (`<課題>-fixed-start/`)。元の課題フォルダーの
 * 隣に別のフォルダーとして置き、学習者のファイルに触れない。課題 ID の末尾には使えない。
 */
export const FIXED_START_SUFFIX = "-fixed-start";

/**
 * API・配布・教材検査で同じ公開境界を使い、余分な top-level 情報を除く。
 * bundle は教材側で README・starter・tests から組み立て、private は別に保存する。
 * この検証はその構造の境界を確認するもの。本文の機密性は執筆レビューで確認する。
 */
export function parsePublicTaskBundle(raw: unknown): TaskBundle {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("manifest" in raw) ||
    !("files" in raw) ||
    !("contentHash" in raw)
  )
    throw new Error("課題の配布データが不正です");
  const manifest = parseTaskManifest(raw.manifest);
  if (
    !manifest.ok ||
    typeof raw.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(raw.contentHash) ||
    typeof raw.files !== "object" ||
    raw.files === null ||
    Array.isArray(raw.files)
  )
    throw new Error("課題の配布データが不正です");
  const files = raw.files as Record<string, unknown>;
  for (const [path, value] of Object.entries(files)) {
    if (
      !isSafeRelativePattern(path) ||
      /[*?{}[\]]/.test(path) ||
      path.split("/").some((s) => ["private", "solution", "variants"].includes(s)) ||
      ["hints.md", "explanation.md", "review.md"].includes(path) ||
      typeof value !== "string"
    )
      throw new Error(`配布できないファイルです: ${path}`);
  }
  return {
    manifest: manifest.manifest,
    contentHash: raw.contentHash,
    files: files as Record<string, string>,
  };
}
