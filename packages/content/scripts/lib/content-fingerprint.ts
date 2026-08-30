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
 * seed の入力になるパス。1 つでも漏らすと「変わったのに飛ばす」が起きるので、
 * 迷ったら広く取る (ここに載っていても普段は変わらないディレクトリばかり)。
 *
 * - packages/content        … 教材の正本・PDF 変換スクリプト・skin・サムネイル
 * - packages/shared/src     … 講座マニフェスト / クイズ / 面談質問 / 演習課題
 * - packages/shared/scripts … export-seed-sql.ts そのもの
 * - apps/web/src/data       … export-seed-sql が読む TENANTS と型
 * - apps/api/scripts        … seed-d1.ts と分割・適用のロジック
 * - apps/api/drizzle        … migration。新しい列を seed が埋める形の変更があるので、
 *                             スキーマが動いた push では教材が同じでも seed を流す
 */
export const SEED_INPUT_PATHS = [
  "packages/content",
  "packages/shared/src",
  "packages/shared/scripts",
  "apps/web/src/data",
  "apps/api/scripts",
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
