/**
 * AI 一次レビューの評価用データを書き出し、人の判定との一致率を版ごとに出す (07 §6.6)。
 *
 *   bun run --filter=@stella/api ai-review:eval                      # ローカル D1
 *   bun run --filter=@stella/api ai-review:eval -- --remote --out eval.jsonl
 *
 * 人がレビューした提出だけが対象。モデル (`AI_REVIEW_MODEL`) や指示 (`AI_REVIEW_PROMPT_VERSION`)
 * を切り替えた期間ごとに一致率を比べ、採用する組み合わせを決める。しきい値の見直し (月 1 回) の
 * 目安 (練習・中を覆した割合 > 1 割、人に回して合格 > 8 割) も同じ表に出す。
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  EVAL_SOURCE_SQL,
  type EvalSourceRow,
  formatAgreementTable,
  summarizeAgreement,
  toExample,
} from "./lib/ai-review-eval.js";

const apiDir = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const remote = args.includes("--remote");
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? args[outIndex + 1] : undefined;

function query<T>(sql: string): T[] {
  const stdout = execFileSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      "stella-db",
      remote ? "--remote" : "--local",
      "--json",
      "--command",
      sql,
    ],
    { cwd: apiDir, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  // wrangler が JSON の前に案内を出すことがあるので、最初の `[` 以降を読む。
  const start = stdout.indexOf("[");
  const parsed = JSON.parse(start >= 0 ? stdout.slice(start) : stdout) as { results: T[] }[];
  return parsed[0]?.results ?? [];
}

const examples = query<EvalSourceRow>(EVAL_SOURCE_SQL).map(toExample);
if (out) {
  writeFileSync(
    out,
    examples.map((e) => JSON.stringify(e)).join("\n") + (examples.length ? "\n" : ""),
  );
  console.log(`評価用データ: ${examples.length} 件を ${out} に書き出しました`);
}
console.log(formatAgreementTable(summarizeAgreement(examples)));
