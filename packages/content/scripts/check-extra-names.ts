/**
 * 外部リポジトリの名前の台帳と、stella 本体の講座 slug の検査。`check:ci` から呼ばれる。
 *
 * 登録した名前で始まる講座は、外部リポジトリの slug の頭に使う。stella 本体が同じ頭を使うと、
 * あとから足した講座が外部の講座と同じ安定 UUID になる。
 * 作業用の写し (`.stella-extra-workspace`) では、`.extra-overlay.json` に書いた講座だけを外す。
 */
import { join } from "node:path";

import { checkExtraRepositoryNames } from "../src/extra-content.js";

const contentRoot = join(import.meta.dirname, "..");
const repoRoot = join(import.meta.dirname, "..", "..", "..");

try {
  checkExtraRepositoryNames(contentRoot, repoRoot);
  console.log("外部リポジトリの名前: stella の講座は登録した名前で始まっていません");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
