/**
 * AI 一次レビューの候補 (モデル・指示の版) を、人がレビューした過去の提出に当て直して比べる
 * (リプレイ。07 §6.6・§6.8)。`ai-review:eval` は運用で切り替えた期間ごとの一致率しか出せないので、
 * 同じ提出に候補を当て直して並べる。
 *
 *   # 1. 見積もり (既定。API は呼ばない)。候補は `<モデル>@<指示の版>`。省けば本番の既定。
 *   bun run --filter=@stella/api ai-review:replay -- --remote \
 *     --candidate claude-sonnet-4-6@2026-10-06.1 --candidate claude-opus-4-8@2026-10-06.1
 *
 *   # 2. Message Batches に投入する (--run と --limit が両方あるときだけ API を呼ぶ)
 *   bun run --filter=@stella/api ai-review:replay -- --remote --candidate ... --run --limit 50
 *
 *   # 3. 回収して比べる (終わっていなければ進み具合だけを出す。何度でも流せる)
 *   bun run --filter=@stella/api ai-review:replay -- --collect .ai-review-replay/<日時>
 *
 * - 評価用データは `ai-review:eval` と同じ (人がレビューした提出)。`--data eval.jsonl` で
 *   `ai-review:eval --out` の書き出しを使うと、同じ提出の集まりで何度でも比べられる。
 * - D1 と R2 は wrangler (`getPlatformProxy`) 経由で読むだけで、書かない。`--remote` が無ければ
 *   `wrangler dev` の手元のデータを読む。リモートは `wrangler login` (か `CLOUDFLARE_API_TOKEN`)。
 * - 投入と回収には `ANTHROPIC_API_KEY` が要る。本番と同じ要求を Batch で送る (費用は半額、本番の
 *   呼び出しの上限とは別枠)。受講者の名前・メール・ID は送らない。
 * - 投入すると `apps/api/.ai-review-replay/<日時>/state.json` (gitignore 済み) に、回収に要る状態を
 *   残す。判定に使う提出の本文を含むので、比べ終えたら消してよい。回収した結果は同じ場所の
 *   `report.md` / `report.json` (提出 ID・課題・判定だけ) に書く。
 * - 候補の指示は `src/lib/ai-review-prompt.ts` の登録簿 (`AI_REVIEW_PROMPTS`) に版を足して並べる。
 */

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { resolveAnthropicModel } from "../src/lib/anthropic-complete.js";
import { EVAL_SOURCE_SQL, type EvalSourceRow, toExample } from "./lib/ai-review-eval.js";
import {
  type BatchApi,
  collectReplay,
  formatReplayReport,
  parseEvalJsonl,
  parseReplayArgs,
  type ReplayState,
  replayPrepareCommand,
} from "./lib/ai-review-replay.js";
import { openReplayBindings } from "./lib/replay-bindings.js";

const apiDir = join(import.meta.dirname, "..");
const stateRoot = join(apiDir, ".ai-review-replay");

function batchApi(): BatchApi {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY が未設定です");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return {
    create: (body) => client.messages.batches.create(body),
    retrieve: (id) => client.messages.batches.retrieve(id),
    results: (id) => client.messages.batches.results(id),
  };
}

/** 状態と結果は本人だけが読める形で書く (提出の本文を含む)。 */
function writePrivate(path: string, text: string) {
  writeFileSync(path, text, { mode: 0o600 });
  chmodSync(path, 0o600);
}

const args = parseReplayArgs(
  process.argv.slice(2),
  // 本番と同じ既定 (AI_REVIEW_MODEL → ANTHROPIC_MODEL → 既定)。
  resolveAnthropicModel(
    { ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL },
    process.env.AI_REVIEW_MODEL,
  ),
);

if (args.mode === "collect") {
  const dir = resolve(args.dir);
  const state = JSON.parse(readFileSync(join(dir, "state.json"), "utf8")) as ReplayState;
  const collected = await collectReplay(batchApi(), state);
  if (collected.status === "pending") {
    for (const b of collected.batches)
      console.log(
        `${b.id}: ${b.status} (処理中 ${b.counts.processing} / 成功 ${b.counts.succeeded} / 失敗 ${b.counts.errored} / 期限切れ ${b.counts.expired})`,
      );
    console.log("まだ終わっていません。しばらくしてからもう一度回収してください。");
  } else {
    const markdown = formatReplayReport(collected.report);
    writePrivate(join(dir, "report.json"), `${JSON.stringify(collected.report, null, 2)}\n`);
    writePrivate(join(dir, "report.md"), `${markdown}\n`);
    console.log(markdown);
    console.log(`\n結果: ${join(dir, "report.md")} / report.json`);
  }
} else {
  // 投入するときは、D1 と R2 を読む前に API キーを確かめる (読み終えてから止まらない)。
  const api = args.run ? batchApi() : null;
  const bindings = await openReplayBindings({ remote: args.remote, apiDir });
  try {
    const examples = args.data
      ? parseEvalJsonl(readFileSync(args.data, "utf8"))
      : ((await bindings.env.DB.prepare(EVAL_SOURCE_SQL).all<EvalSourceRow>()).results ?? []).map(
          toExample,
        );
    let progress = false;
    await replayPrepareCommand(args, {
      bindings,
      examples,
      batchApi: () => {
        if (!api) throw new Error("dry-run では API を呼びません");
        return api;
      },
      saveState: (state) => {
        const name = state.createdAt.replace(/[:.]/g, "-");
        const dir = join(stateRoot, name);
        mkdirSync(dir, { recursive: true, mode: 0o700 });
        writePrivate(join(dir, "state.json"), `${JSON.stringify(state)}\n`);
        return join(".ai-review-replay", name);
      },
      log: (text) => {
        if (progress) process.stderr.write("\n");
        progress = false;
        console.log(text);
      },
      onProgress: (done, total) => {
        progress = true;
        process.stderr.write(`\r素材を読んでいます: ${done}/${total}`);
      },
    });
  } finally {
    await bindings.dispose();
  }
}
