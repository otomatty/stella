#!/usr/bin/env bun
/**
 * stage.json のスキルツリー用フィールド (prerequisites / canDo / theme) を検査する。
 *
 *   bun run scripts/check-graph.ts
 *
 * 型・参照先・自己参照・循環の検査は manifest ビルド (`buildContentManifest`) を使う。
 * ここでは実教材全体を読み、catalog の根が `ENTRY_STAGE_SLUG` だけであることも検査する。
 *
 * 前提はスキルツリーのハードロックなので、綴り違いや循環をそのまま D1 へ流すと
 * 「誰も開けないステージ」が黙って生まれる。実行時 (評価器) は安全側に locked で倒すだけで
 * 画面には何も出ないので、気付ける場所はここしかない。
 *
 * bun で走らせるのは、manifest が TypeScript で `.js` 拡張子の相対 import を使っており、
 * Node の型ストリップでは解決できないため (build.mjs から spawn せず、package.json の
 * `check:ci` で並べて呼ぶ)。
 */
import { buildContentManifest, ENTRY_STAGE_SLUG } from "../src/manifest.js";

try {
  const { stages } = buildContentManifest();
  const catalogRoots = stages
    .filter((stage) => stage.audience !== "granted" && !stage.prerequisites?.length)
    .map((stage) => stage.id);
  if (catalogRoots.length !== 1 || catalogRoots[0] !== ENTRY_STAGE_SLUG) {
    throw new Error(
      `catalog で前提なしにできるステージは ${ENTRY_STAGE_SLUG} だけです (検出: ${catalogRoots.join(", ") || "なし"})。`,
    );
  }
  const withPrereq = stages.filter((c) => (c.prerequisites?.length ?? 0) > 0).length;
  console.log(
    `前提グラフ: ${stages.length} ステージ (前提つき ${withPrereq} 件) — 未知 slug・自己参照・循環なし`,
  );
} catch (err) {
  console.error(`\n${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
