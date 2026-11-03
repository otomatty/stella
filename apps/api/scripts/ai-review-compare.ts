/** モデル切り替え前の少数比較。既定は API を呼ばない。結果にも提出の本文を残さない。 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compareReview, parseCompareArgs, prepareComparison } from "./lib/ai-review-compare.js";
import {
  EVAL_SOURCE_SQL,
  type EvalSourceRow,
  formatAgreementTable,
  summarizeAgreement,
  toExample,
} from "./lib/ai-review-eval.js";
import { parseEvalJsonl, subjectsOf } from "./lib/ai-review-replay.js";
import { openReplayBindings } from "./lib/replay-bindings.js";
import { requireReviewCredentials } from "../src/lib/ai-review-provider.js";

const args = parseCompareArgs(process.argv.slice(2));
const apiDir = join(import.meta.dirname, "..");
const bindings = await openReplayBindings({ remote: args.remote, apiDir });
try {
  const env = {
    ...bindings.env,
    AI_REVIEW_PROVIDER: args.provider,
    AI_REVIEW_MODEL: args.model,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? bindings.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? bindings.env.ANTHROPIC_API_KEY,
  };
  if (args.run) requireReviewCredentials(env, args.provider);
  const examples = args.data
    ? parseEvalJsonl(readFileSync(args.data, "utf8"))
    : ((await env.DB.prepare(EVAL_SOURCE_SQL).all<EvalSourceRow>()).results ?? []).map(toExample);
  const latest = new Map(examples.map((example) => [example.submissionId, example]));
  const prepared = [];
  const skipped: Record<string, number> = {};
  for (const subject of subjectsOf(examples)) {
    if (prepared.length >= args.limit) break;
    const example = latest.get(subject.submissionId);
    if (!example) continue;
    const item = await prepareComparison(bindings.db, env, example);
    if ("skipped" in item) skipped[item.skipped] = (skipped[item.skipped] ?? 0) + 1;
    else prepared.push(item);
  }
  console.log(
    JSON.stringify({
      provider: args.provider,
      model: args.model,
      submissions: prepared.length,
      skipped,
      apiCalls: args.run ? prepared.length : 0,
    }),
  );
  if (args.run) {
    const results = [];
    for (const item of prepared) results.push(await compareReview(env, item));
    const dir = join(apiDir, ".ai-review-compare", new Date().toISOString().replace(/[:.]/g, "-"));
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const summary = formatAgreementTable(summarizeAgreement(results));
    writeFileSync(
      join(dir, "report.json"),
      JSON.stringify({ provider: args.provider, model: args.model, results, skipped }, null, 2),
      { mode: 0o600 },
    );
    writeFileSync(join(dir, "report.md"), summary, { mode: 0o600 });
    console.log(summary);
    console.log(`結果: ${dir}`);
  }
} finally {
  await bindings.dispose();
}
