/**
 * 「seed に入るもの」の内容指紋。
 *
 * デプロイの教材パイプライン (R2 画像 → PDF → D1 seed) は、正本が 1 バイトも
 * 変わっていない push でもフルで走っていた (Issue #266)。指紋を R2 に置いておき、
 * 前回デプロイ成功時と同じなら丸ごと飛ばす。
 *
 * 判定は git の index 上の blob ID (= 内容ハッシュ) で行う。コミット間の diff では
 * なく「今の内容そのもの」を見るので、前回のデプロイが seed の手前で落ちていた
 * 場合や、force push / Re-run のあとでも「まだ入っていない教材を飛ばす」ことが
 * 起きない (指紋は seed まで通ったときにだけ更新するため)。
 */

import { createHash } from "node:crypto";

/**
 * seed・教材 PDF・図解アップロードの入力になるパス。
 *
 * この指紋は教材パイプライン全体 (R2 画像 → PDF → D1 seed) の入口なので、
 * 広く取るほど API だけの push でも Playwright と seed が走る。2026-10-06 は
 * その seed が D1 の 1 日の書き込み枠を使い切った。見るのは次だけにする。
 *
 * - 生成結果に入るファイル (講座・規則・スキル・環境・旧演習・migration)
 * - 生成コードが **値として** import しているファイル (型だけの import は SQL も
 *   PDF も変わらないので見ない)
 * - 生成コードが readFileSync で読むファイル (import に出ない)
 *
 * 値 import を足したのにここに無いと `content-fingerprint.test.ts` が落とす。
 * migration は、新しい列を seed が埋める形があるので教材が同じでも流す。
 */
export const SEED_INPUT_PATHS = [
  // 教材の正本と、生成コードがパスで読む台帳。
  "packages/content/courses",
  "packages/content/coding-rules.md",
  "packages/content/skills.json",
  "packages/content/patterns.json",
  "packages/content/environments",
  "packages/content/sources/registry.json",
  // seed / PDF / 画像アップロードの生成コード (値 import の先)。
  "packages/content/src/coding-rules.ts",
  "packages/content/src/index.ts",
  "packages/content/src/manifest.ts",
  "packages/content/src/material-pdf.ts",
  "packages/content/src/natural-order.mjs",
  "packages/content/src/parse-knowledge.ts",
  "packages/content/src/parse-quiz.ts",
  "packages/content/src/parse-slides.ts",
  "packages/content/src/practice-pdf.ts",
  "packages/content/src/source-references.ts",
  "packages/content/src/split-slides.ts",
  "packages/content/src/task-content.ts",
  "packages/content/src/task-schema.ts",
  "packages/content/scripts/build-pdf.ts",
  "packages/content/scripts/upload-materials.ts",
  "packages/content/scripts/upload-pdfs.ts",
  "packages/content/scripts/lib/doc-html.ts",
  "packages/content/scripts/lib/r2.ts",
  "packages/content/scripts/lib/slide-html.ts",
  "packages/content/scripts/lib/wrangler-config.ts",
  "packages/content/scripts/pdf/print-doc.css",
  "packages/shared/scripts/export-seed-sql.ts",
  "packages/shared/scripts/lesson-id-remap.ts",
  "packages/shared/src/problems",
  "packages/shared/src/assignment-helpers.ts",
  "packages/shared/src/curriculum/chapters.ts",
  "packages/shared/src/interview/questions.json",
  "packages/shared/src/interview/questions.ts",
  "packages/shared/src/lint-presets.ts",
  "packages/shared/src/markdown/os-blocks.ts",
  "packages/shared/src/review/ai-review.ts",
  "packages/shared/src/study/activity.ts",
  "packages/shared/src/tasks/catalog.ts",
  "packages/shared/src/tasks/ci-run.ts",
  "packages/shared/src/tasks/environment.ts",
  "packages/shared/src/tasks/hash.ts",
  "packages/shared/src/tasks/help.ts",
  "packages/shared/src/tasks/manifest.ts",
  "packages/shared/src/tasks/run-result.ts",
  "packages/shared/src/tasks/runners.ts",
  "packages/shared/src/tasks/source-reference.ts",
  "packages/shared/src/tasks/submission-support.ts",
  "packages/shared/src/tasks/submission.ts",
  "packages/shared/src/tasks/variants.ts",
  "apps/web/src/data/seed-catalog.ts",
  "apps/web/src/components/learner/slides-skin.css",
  "apps/api/scripts/seed-d1.ts",
  "apps/api/scripts/lib/d1-remote.ts",
  // 新しい列を seed が埋める migration では、教材が同じでも seed を流す。
  "apps/api/drizzle",
] as const;

export const CONTENT_STATE_KEY = "deploy/content-state.json";

export interface ContentState {
  version: 1;
  fingerprint: string;
  updatedAt: string;
  commit?: string;
}

/**
 * `git ls-files -s -- <paths>` の出力から指紋を作る。
 *
 * 対象パスの一覧も混ぜる — 対象を足したのに指紋が変わらないと、その push だけ
 * 新しい入力を見ないまま飛ばしてしまう。
 *
 * `extra` はリポジトリの外にある入力 (今は PDF_KEY_SALT の要約)。値そのものは
 * 呼び出し側でハッシュ済みのものを渡す — 記録は公開バケットに置くため。
 */
export function fingerprintFrom(
  lsFilesOutput: string,
  paths: readonly string[],
  extra: Readonly<Record<string, string>> = {},
): string {
  const lines = lsFilesOutput
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .sort();
  const h = createHash("sha256");
  h.update(`paths:${[...paths].sort().join(",")}\n`);
  for (const [key, value] of Object.entries(extra).sort()) h.update(`${key}=${value}\n`);
  for (const line of lines) h.update(`${line}\n`);
  return h.digest("hex");
}

export function parseContentState(text: string): ContentState | null {
  try {
    const parsed = JSON.parse(text) as ContentState;
    if (parsed.version !== 1 || typeof parsed.fingerprint !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
