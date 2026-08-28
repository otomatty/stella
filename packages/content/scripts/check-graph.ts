#!/usr/bin/env bun
/**
 * course.json のスキルツリー用フィールド (prerequisites / canDo / theme) を検査する。
 *
 *   bun run scripts/check-graph.ts
 *
 * 検査の中身は manifest ビルド (`buildContentManifest`) がそのまま持っている
 * (`readCourseConfig` の型検査と `assertPrerequisiteGraph` の未知 slug / 自己参照 /
 * 循環検出)。ここはそれを **CI のゲートから呼ぶための入口** で、判定を書き直さない —
 * 検査が 2 か所にあると、片方だけ直して「seed は通るのに CI は落ちる」が起きる。
 *
 * 前提はスキルツリーのハードロックなので、綴り違いや循環をそのまま D1 へ流すと
 * 「誰も開けない講座」が黙って生まれる。実行時 (評価器) は安全側に locked で倒すだけで
 * 画面には何も出ないので、気付ける場所はここしかない。
 *
 * bun で走らせるのは、manifest が TypeScript で `.js` 拡張子の相対 import を使っており、
 * Node の型ストリップでは解決できないため (build.mjs から spawn せず、package.json の
 * `check:ci` で並べて呼ぶ)。
 */
import { buildContentManifest } from "../src/manifest.js";

try {
  const { courses } = buildContentManifest();
  const withPrereq = courses.filter((c) => (c.prerequisites?.length ?? 0) > 0).length;
  console.log(
    `前提グラフ: ${courses.length} 講座 (前提つき ${withPrereq} 件) — 未知 slug・自己参照・循環なし`,
  );
} catch (err) {
  console.error(`\n${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
