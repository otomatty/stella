/**
 * AI で類題の下書きを作る (#69・07 §7.3)。決めたことは Issue #69 の「決めたこと」。
 *
 *   bun run --filter=@stella/content variants:draft -- <課題ID>                      # 在庫の不足分を作る
 *   bun run --filter=@stella/content variants:draft -- <課題ID> --kind independent --count 2
 *   bun run --filter=@stella/content variants:draft -- <課題ID> --dry-run            # 何を作るかとプロンプトだけ
 *   bun run --filter=@stella/content variants:draft -- <課題ID> --batch              # Batch API (半額・非同期)
 *   bun run --filter=@stella/content variants:draft -- --collect <batch ID>          # Batch の結果を受け取る
 *
 * - 実行前に入力のトークン数を数えて概算の費用を出し、確かめてから作る (`--yes` で確認を省く)。
 *   1 回の実行で 20 問まで。
 * - 下書きは教材の一時の複製で検査し (教材の形・解答例が通る・誤答が落ちる)、落ちたら最大 2 回
 *   直させる。通った下書きだけを `private/variants/` (テンプレートの値は `params.json`) に書く。
 *   git は操作しない。PR のレビューとマージが在庫に入れる承認。
 * - 認証は Anthropic SDK の既定 (`ANTHROPIC_API_KEY` か `ant auth login` のプロファイル)。
 *   モデルは `VARIANT_DRAFT_MODEL` (未設定なら claude-opus-5-5)。
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";

import { buildContentManifest } from "../src/manifest.js";
import {
  type DraftGroup,
  estimateDrafts,
  planDrafts,
  templateKindsOf,
  variantStockOf,
} from "../src/variant-drafts.js";
import {
  type DraftBlock,
  type DraftModel,
  type DraftRequest,
  type DraftTarget,
  draftGuide,
  draftRequest,
  runDraftGroup,
} from "./lib/variant-draft-run.js";

const MODEL = process.env.VARIANT_DRAFT_MODEL ?? "claude-opus-5-5";
/** 課題文・コード・テスト・誤答をまとめて書くので出力を長く取る (ストリーミングで受ける)。 */
const MAX_TOKENS = 64_000;
const contentRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const batchDir = join(contentRoot, "dist/variant-drafts");

function option(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const valued = new Set(["--kind", "--count", "--collect"]);
const positional = args.filter((a, i) => !a.startsWith("--") && !valued.has(args[i - 1] ?? ""));

function blocks(list: DraftBlock[]) {
  return list.map((b) => ({
    type: "text" as const,
    text: b.text,
    ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}
function toParams(request: DraftRequest) {
  return {
    model: MODEL,
    system: blocks(request.system),
    messages: request.messages.map((m) => ({ role: m.role, content: blocks(m.content) })),
  };
}
function outputConfig(request: DraftRequest) {
  return {
    // テストと誤答の質が要るので effort は high にする (claude-opus-5-5 の既定は medium)。
    effort: "high" as const,
    format: { type: "json_schema" as const, schema: request.schema as Record<string, unknown> },
  };
}
function textOf(message: { content: { type: string; text?: string }[] }): string {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

function sdkModel(client: Anthropic): DraftModel {
  return {
    async countTokens(request) {
      const counted = await client.messages.countTokens(toParams(request));
      return counted.input_tokens;
    },
    async complete(request) {
      const message = await client.beta.messages
        .stream({
          ...toParams(request),
          max_tokens: MAX_TOKENS,
          output_config: outputConfig(request),
          // 拒否されたときは server-side fallback が既定の代わりのモデルで続ける。
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        })
        .finalMessage();
      if (message.stop_reason === "refusal") throw new Error("モデルが応答を拒否しました");
      if (message.stop_reason === "max_tokens")
        throw new Error("出力が max_tokens で切れました。--count を減らしてください");
      return JSON.parse(textOf(message)) as unknown;
    },
  };
}

function findTask(taskId: string): DraftTarget {
  const task = buildContentManifest(join(contentRoot, "courses")).tasks.find(
    (t) => t.definition.id === taskId,
  );
  if (!task) throw new Error(`課題が見つかりません: ${taskId}`);
  if (task.variantOf)
    throw new Error(`${taskId} は類題です。親の課題 (${task.variantOf}) を指定してください`);
  return { contentRoot, taskDir: task.directory };
}

function describe(group: DraftGroup): string {
  return `${group.kind} を ${group.count} 問 (${group.template ? `テンプレート ${group.template} の値` : "丸ごと"})`;
}

function money(value: number | null): string {
  return value === null ? "(料金を知らないモデル)" : `約 $${value.toFixed(2)}`;
}

async function confirm(question: string): Promise<boolean> {
  if (flags.has("--yes")) return true;
  if (!process.stdin.isTTY) throw new Error("確認できない環境です。--yes を付けて実行してください");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

interface BatchState {
  model: string;
  taskId: string;
  groups: DraftGroup[];
  createdAt: string;
  /** 受け取って書き出したまとまりの番号。受け取り直しで同じ下書きを二重に書き出さない。 */
  collected?: number[];
}

async function report(
  results: { group: DraftGroup; outcome: Awaited<ReturnType<typeof runDraftGroup>> }[],
) {
  let failed = 0;
  for (const { group, outcome } of results) {
    console.log(`\n${describe(group)}:`);
    for (const name of outcome.written) console.log(`  ✓ ${name}`);
    for (const f of outcome.failed) {
      failed += 1;
      console.log(`  ✗ ${f.name} (直しても検査に通らなかったので書き出していません)`);
      for (const e of f.errors) console.log(`      ${e.split("\n").join("\n      ")}`);
    }
    if (outcome.missing > 0) {
      // Batch では受け取り済みとして記録するので、足りない分は作り直してもらう (失敗で終える)。
      failed += outcome.missing;
      console.log(
        `  ! 頼んだ数より ${outcome.missing} 問少なく返ってきました。足りない分は --kind と --count で作り直してください`,
      );
    }
  }
  console.log(
    "\n書き出した類題は content:check を通して PR でレビューしてください (unitId の版と references.json の contentHash の更新も忘れずに)。",
  );
  if (failed > 0) process.exitCode = 1;
}

async function collect(batchId: string) {
  const path = join(batchDir, `${batchId}.json`);
  if (!existsSync(path)) throw new Error(`Batch の記録がありません: ${path}`);
  const state = JSON.parse(readFileSync(path, "utf8")) as BatchState;
  if (state.model !== MODEL)
    throw new Error(`Batch は ${state.model} で作りました。VARIANT_DRAFT_MODEL をそろえてください`);
  const collected = new Set(state.collected ?? []);
  if (state.groups.every((_group, i) => collected.has(i))) {
    console.log(`Batch ${batchId} は受け取り済みです`);
    return;
  }
  const client = new Anthropic();
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") {
    console.log(
      `まだ終わっていません (処理中 ${batch.request_counts.processing}・成功 ${batch.request_counts.succeeded})。あとでもう一度実行してください`,
    );
    return;
  }
  const firsts = new Map<string, unknown>();
  for await (const result of await client.messages.batches.results(batchId)) {
    if (result.result.type !== "succeeded") continue;
    const message = result.result.message;
    if (message.stop_reason !== "end_turn") continue;
    try {
      firsts.set(result.custom_id, JSON.parse(textOf(message)));
    } catch {
      // 読めなかった依頼は失敗として報告する
    }
  }
  const target = findTask(state.taskId);
  const guide = draftGuide(contentRoot);
  const model = sdkModel(client);
  const results = [];
  let unreceived = 0;
  // 途中で止まっても、書き出し済みのまとまりの結果は報告する (受け取り直しでは飛ばすため)。
  try {
    for (const [i, group] of state.groups.entries()) {
      if (collected.has(i)) {
        console.log(`\n${describe(group)}: 受け取り済みです`);
        continue;
      }
      const first = firsts.get(`g${i}`);
      if (first === undefined) {
        unreceived += 1;
        console.log(
          `\n${describe(group)}: Batch の結果を受け取れませんでした。--batch を付けずに作り直してください`,
        );
        continue;
      }
      results.push({
        group,
        outcome: await runDraftGroup(model, target, group, {
          guide,
          first,
          log: (line) => console.log(line),
        }),
      });
      // 書き出したらすぐ記録する (後のまとまりで止まっても、受け取り直しで同じ下書きを書かない)。
      collected.add(i);
      // 書きかけで止まって記録が壊れないよう、一時ファイルに書いてから置き換える。
      writeFileSync(
        `${path}.tmp`,
        `${JSON.stringify({ ...state, collected: [...collected].sort((a, b) => a - b) }, null, 2)}\n`,
      );
      renameSync(`${path}.tmp`, path);
    }
  } finally {
    await report(results);
  }
  if (unreceived > 0) process.exitCode = 1;
}

async function main() {
  const collectId = option("--collect");
  if (collectId) return collect(collectId);
  const taskId = positional[0];
  if (!taskId)
    throw new Error("課題 ID を指定してください (例: dev-env-basics/m0-first-page/q01-first-page)");
  const count = option("--count");
  const target = findTask(taskId);
  const stock = variantStockOf(target.taskDir);
  console.log(`${taskId}: 在庫は補習 ${stock.remedial} 問・確認用 ${stock.check} 問`);
  const groups = planDrafts(stock, templateKindsOf(target.taskDir), {
    ...(option("--kind") ? { kind: option("--kind") } : {}),
    ...(count !== undefined ? { count: Number(count) } : {}),
  });
  if (groups.length === 0) {
    console.log(
      "在庫は足りています (補習 3 問・確認用 3 問)。--kind と --count で指定すれば作れます",
    );
    return;
  }
  for (const group of groups) console.log(`  作るもの: ${describe(group)}`);
  const guide = draftGuide(contentRoot);
  const requests = groups.map((group) => draftRequest(target, group, guide));
  if (flags.has("--dry-run")) {
    for (const [i, request] of requests.entries()) {
      const text = [...request.system, ...request.messages.flatMap((m) => m.content)]
        .map((b) => b.text)
        .join("\n");
      console.log(
        `\n--- 依頼 ${i + 1} (${text.length} 文字) ---\n${request.messages[0]?.content.at(-1)?.text ?? ""}`,
      );
    }
    return;
  }
  const client = new Anthropic();
  const model = sdkModel(client);
  const batch = flags.has("--batch");
  const counted = await Promise.all(requests.map((request) => model.countTokens(request)));
  const estimate = estimateDrafts(
    MODEL,
    groups.map((group, i) => ({
      inputTokens: counted[i] ?? 0,
      count: group.count,
      mode: group.template ? "params" : "full",
    })),
    { batch },
  );
  console.log(
    `\n見積もり (${MODEL}${batch ? "・Batch" : ""}): 入力 ${estimate.inputTokens} トークン・出力 約 ${estimate.outputTokens} トークン\n  直しなし ${money(estimate.usual)}、すべての下書きを 2 回直した場合 最大 ${money(estimate.worst)}`,
  );
  if (!(await confirm("作りますか？"))) return;

  if (batch) {
    const created = await client.messages.batches.create({
      requests: requests.map((request, i) => ({
        custom_id: `g${i}`,
        params: {
          ...toParams(request),
          max_tokens: MAX_TOKENS,
          output_config: outputConfig(request),
        },
      })),
    });
    mkdirSync(batchDir, { recursive: true });
    const state: BatchState = { model: MODEL, taskId, groups, createdAt: new Date().toISOString() };
    writeFileSync(join(batchDir, `${created.id}.json`), `${JSON.stringify(state, null, 2)}\n`);
    console.log(
      `Batch ${created.id} を送りました (多くは 1 時間以内、最長 24 時間)。受け取りは:\n  bun run --filter=@stella/content variants:draft -- --collect ${created.id}`,
    );
    return;
  }
  const results = [];
  for (const group of groups)
    results.push({
      group,
      outcome: await runDraftGroup(model, target, group, {
        guide,
        log: (line) => console.log(line),
      }),
    });
  await report(results);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
