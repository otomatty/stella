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
}
/** 公開用の明示的なファイル一覧。private とレビュー用の素材はここに載せない。 */
export interface TaskBundle {
  manifest: TaskManifest;
  contentHash: string;
  files: Record<string, string>;
}

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
