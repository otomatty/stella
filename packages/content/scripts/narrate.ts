/**
 * 教材動画の台本 (narration.json) を Claude で下書きする (設計書の ① 台本)。
 *
 *   bun run --filter=@stella/content narrate -- courses/it-basics            # 台本が無い / 古いトピックだけ
 *   bun run --filter=@stella/content narrate -- courses/it-basics --batch    # Message Batches (費用半額・非同期)
 *   bun run --filter=@stella/content narrate -- <path> --force               # 台本があっても作り直す
 *   bun run --filter=@stella/content narrate -- <path> --accept              # LLM を呼ばず slidesHash だけ承認し直す
 *   bun run --filter=@stella/content narrate -- <path> --dry-run             # 送るプロンプトを表示するだけ
 *
 * 手順: NARRATION_GUIDE.md をシステムプロンプトにし、スライド (本文 + 講師ノート)・
 * doc.md の該当節・導入済みの語彙を渡して、JSON Schema で構造化出力させる。
 * 検証器 (src/narration.ts) に通し、違反があれば理由を添えてそのトピックだけ
 * 作り直させる (最大 2 回)。通らなければ書かずに止める。
 *
 * 出力はレビューしてから commit する (PR の差分で読む)。API キーは ANTHROPIC_API_KEY。
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import {
  applyReadings,
  formatIssue,
  type NarrationFile,
  type NarrationIssue,
  slidesHash,
  stringifyNarration,
} from "../src/narration.js";
import { splitSlides } from "../src/split-slides.js";
import {
  collectNarrationTopics,
  contentRoot,
  type NarrationTopic,
  validateTopic,
} from "./lib/narration-topics.js";

const MODEL = process.env.NARRATION_MODEL ?? "claude-opus-5-5";
const MAX_ATTEMPTS = 3;

const args = process.argv.slice(2);
const selectors = args.filter((a) => !a.startsWith("--"));
const force = args.includes("--force");
const accept = args.includes("--accept");
const batch = args.includes("--batch");
const dryRun = args.includes("--dry-run");

const guide = readFileSync(join(contentRoot, "NARRATION_GUIDE.md"), "utf8");
const guideHash = createHash("sha256").update(guide).digest("hex").slice(0, 8);

/** 構造化出力のスキーマ。speech は読みを変えないときは空文字にさせる。 */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "字幕 (60 字以内の 1 文)" },
                speech: {
                  type: "string",
                  description: "読み辞書で足りないときだけの読み上げ文。不要なら空文字",
                },
              },
              required: ["text", "speech"],
              additionalProperties: false,
            },
          },
        },
        required: ["cues"],
        additionalProperties: false,
      },
    },
  },
  required: ["slides"],
  additionalProperties: false,
} as const;

interface DraftOutput {
  slides: { cues: { text: string; speech: string }[] }[];
}

function userPrompt(topic: NarrationTopic): string {
  const slides = splitSlides(topic.slidesSource);
  const readingKeys = Object.keys(topic.readings);
  const blocks = slides.map((s, i) =>
    [
      `### スライド ${i + 1}${s.cls ? ` (${s.cls})` : ""}`,
      "本文:",
      s.body,
      `講師ノート: ${s.note ?? "(なし)"}`,
    ].join("\n"),
  );
  return [
    `講座: ${topic.courseTitle}`,
    `トピック: ${topic.id} ${topic.title}`,
    `takeaway: ${topic.takeaway}`,
    `このトピックで導入する語: ${topic.introduces.join("、") || "(なし)"}`,
    `前提の語: ${topic.requires.join("、") || "(なし)"}`,
    `これまでに導入済みの語 (専門用語はこれと上の 2 つの範囲で): ${topic.priorVocabulary.join("、") || "(なし)"}`,
    `次トピックのタイトル (言ってはいけない): ${topic.nextTopicTitle ?? "(なし)"}`,
    `読み辞書にある表記 (speech を書かなくても読みが当たる): ${readingKeys.join("、") || "(なし)"}`,
    "",
    `## スライド (${slides.length} 枚)`,
    "",
    blocks.join("\n\n"),
    "",
    "## doc.md の該当節 (補足の材料。数字はここかスライド・ノートにあるものだけ使う)",
    "",
    topic.docSection || "(なし)",
    "",
    `出力: slides に ${slides.length} 個の要素をスライド順に。各スライドの cues は字幕の列。`,
  ].join("\n");
}

function toNarration(topic: NarrationTopic, out: DraftOutput): NarrationFile {
  return {
    schema: 1,
    slidesHash: slidesHash(topic.slidesSource),
    draft: { model: MODEL, guide: guideHash },
    slides: out.slides.map((s) => ({
      cues: s.cues.map((c) => {
        const speech = c.speech.trim();
        // 辞書で同じ読みになるなら speech は書かない (差分と手直しを小さく保つ)。
        return speech === "" ||
          applyReadings(speech, topic.readings) === applyReadings(c.text, topic.readings)
          ? { text: c.text.trim() }
          : { text: c.text.trim(), speech };
      }),
    })),
  };
}

function textOf(message: { content: { type: string; text?: string }[] }): string {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

function retryPrompt(issues: NarrationIssue[]): string {
  return [
    "検査で次のエラーが出ました。直した台本を同じ形式で出し直してください。",
    ...issues.filter((i) => i.level === "error").map((i) => `- ${formatIssue("", i).slice(2)}`),
  ].join("\n");
}

const system = [
  { type: "text" as const, text: guide, cache_control: { type: "ephemeral" as const } },
];

async function draftInteractive(
  client: Anthropic,
  topic: NarrationTopic,
  first?: DraftOutput,
): Promise<NarrationFile> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: userPrompt(topic) },
  ];
  let output = first;
  let issues: NarrationIssue[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (!output) {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system,
        messages,
        output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
        // 教材の文面で拒否されることは想定しにくいが、既定どおり server-side fallback を付ける。
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (res.stop_reason === "refusal") throw new Error("モデルが応答を拒否しました");
      if (res.stop_reason === "max_tokens") throw new Error("出力が max_tokens で切れました");
      const text = textOf(res);
      output = JSON.parse(text) as DraftOutput;
      messages.push({ role: "assistant", content: res.content });
    }
    const narration = toNarration(topic, output);
    issues = validateTopic(topic, narration);
    if (!issues.some((i) => i.level === "error")) return narration;
    console.warn(`  ${topic.courseSlug}/${topic.id}: 検証エラー (試行 ${attempt}/${MAX_ATTEMPTS})`);
    if (first && attempt === 1) {
      // バッチの結果は会話履歴を持たないので、出力を assistant として積み直す。
      messages.push({ role: "assistant", content: JSON.stringify(first) });
    }
    messages.push({ role: "user", content: retryPrompt(issues) });
    output = undefined;
  }
  throw new Error(
    `検証を通る台本になりませんでした:\n${issues.map((i) => formatIssue(topic.id, i)).join("\n")}`,
  );
}

async function draftBatch(
  client: Anthropic,
  topics: NarrationTopic[],
): Promise<Map<string, DraftOutput>> {
  const created = await client.messages.batches.create({
    requests: topics.map((t, i) => ({
      custom_id: `t${i}`,
      params: {
        model: MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: userPrompt(t) }],
        output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      },
    })),
  });
  console.log(`  batch ${created.id}: ${topics.length} requests`);
  for (;;) {
    const b = await client.messages.batches.retrieve(created.id);
    if (b.processing_status === "ended") break;
    console.log(`  … ${b.request_counts.processing} processing`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
  const results = new Map<string, DraftOutput>();
  for await (const r of await client.messages.batches.results(created.id)) {
    if (r.result.type !== "succeeded") continue;
    const message = r.result.message;
    if (message.stop_reason !== "end_turn") continue;
    try {
      results.set(r.custom_id, JSON.parse(textOf(message)) as DraftOutput);
    } catch {
      // 読めなかったものは対話モードで作り直す
    }
  }
  return results;
}

async function main(): Promise<void> {
  const topics = collectNarrationTopics(selectors);

  if (accept) {
    let n = 0;
    for (const t of topics) {
      if (!t.narration) continue;
      const hash = slidesHash(t.slidesSource);
      if (t.narration.slidesHash === hash) continue;
      writeFileSync(t.narrationFile, stringifyNarration({ ...t.narration, slidesHash: hash }));
      console.log(`  accepted ${relative(contentRoot, t.narrationFile)}`);
      n++;
    }
    console.log(`✓ accepted ${n} narration files`);
    return;
  }

  const needs = topics.filter(
    (t) => force || !t.narration || t.narration.slidesHash !== slidesHash(t.slidesSource),
  );
  console.log(`narrate: ${needs.length}/${topics.length} topics need a draft (${MODEL})`);
  if (needs.length === 0) return;
  if (dryRun) {
    console.log(
      `\n--- system (${guideHash}) ---\n${guide.slice(0, 400)}…\n\n--- user ---\n${userPrompt(needs[0])}`,
    );
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY が未設定です (--dry-run でプロンプトだけ確認できます)");
  }
  const client = new Anthropic();
  const firsts = batch ? await draftBatch(client, needs) : new Map<string, DraftOutput>();

  const failed: string[] = [];
  for (const [i, topic] of needs.entries()) {
    const label = `${topic.courseSlug}/${topic.id}`;
    try {
      const narration = await draftInteractive(client, topic, firsts.get(`t${i}`));
      writeFileSync(topic.narrationFile, stringifyNarration(narration));
      const warnings = validateTopic(topic, narration).filter((x) => x.level === "warning");
      console.log(`  ✓ ${label}${warnings.length ? ` (${warnings.length} warnings)` : ""}`);
      for (const w of warnings) console.log(`    ${formatIssue(label, w)}`);
    } catch (e) {
      failed.push(label);
      console.warn(`  ✗ ${label}: ${(e as Error).message}`);
    }
  }
  if (failed.length > 0) {
    console.error(`✗ ${failed.length} topics failed: ${failed.join(", ")}`);
    process.exit(1);
  }
}

await main();
