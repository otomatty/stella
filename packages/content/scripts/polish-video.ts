/** 執筆者が手元で実行する台本校正。CI・動画生成からは呼ばない。 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  applyPolish,
  buildPolishRequest,
  judgeRewrites,
  parsePolishResponse,
  polishResponseSchema,
  sayHash,
  readSavedPolish,
  selectPolishRewrites,
  type PolishSelection,
  type PolishResponse,
  type RewriteJudgment,
} from "../src/video-polish.js";
import { parseStoryboard } from "../src/video-storyboard.js";
import { collectNarrationTopics, contentRoot } from "./lib/narration-topics.js";
import { RetryableError, withRetry } from "./lib/tts.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

function argumentsOf(args: string[]) {
  const selectors: string[] = [];
  const selection: PolishSelection = {};
  let apply = false,
    dryRun = false,
    model = process.env.VIDEO_POLISH_MODEL || "gemini-4-argon";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--only" || arg === "--skip") {
      const value = args[++i];
      if (!value || value.startsWith("--") || value.split(",").some((id) => !id.trim()))
        throw new Error(`${arg} にカンマ区切りのidを指定してください`);
      selection[arg === "--only" ? "only" : "skip"] = value.split(",").map((id) => id.trim());
    } else if (arg === "--model") {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("--model にモデルIDを指定してください");
      model = args[++i];
    } else if (arg.startsWith("-")) throw new Error(`不明なオプション: ${arg}`);
    else selectors.push(arg);
  }
  if (!selectors.length) throw new Error("ステージのslugかトピックのパスを指定してください");
  if (!/^[A-Za-z0-9._-]+$/.test(model))
    throw new Error("モデルIDは英数字・ドット・ハイフン・下線で指定してください");
  if (selection.only !== undefined && selection.skip !== undefined)
    throw new Error("--only と --skip は同時に指定できません");
  if (!apply && (selection.only !== undefined || selection.skip !== undefined))
    throw new Error("--only / --skip は --apply と一緒に指定してください");
  return { selectors, apply, dryRun, model, selection };
}
async function generate(
  model: string,
  key: string,
  request: ReturnType<typeof buildPolishRequest>,
): Promise<unknown> {
  return withRetry("video:polish", async () => {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": key, "content-type": "application/json" },
          signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.system }] },
            contents: [{ role: "user", parts: [{ text: request.user }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: polishResponseSchema,
            },
          }),
        },
      );
    } catch {
      throw new RetryableError("Gemini API との通信に失敗しました");
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      throw new RetryableError(
        `HTTP ${res.status}`,
        Number.isFinite(retryAfter) ? retryAfter : undefined,
      );
    }
    // エラー本文や通信例外に鍵が混ざらないよう、ログには状態だけを出す。
    if (!res.ok) throw new Error(`Gemini API: HTTP ${res.status}`);
    let body: string;
    try {
      body = await res.text();
    } catch {
      throw new RetryableError("Gemini API の応答の受信に失敗しました");
    }
    let data: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error("Gemini API の応答をJSONとして読めません");
    }
    const text = data.candidates?.[0]?.content?.parts
      ?.filter((p) => typeof p.text === "string")
      .at(-1)?.text;
    if (!text) throw new Error("Gemini API の応答に本文がありません");
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini の本文をJSONとして読めません");
    }
  });
}
function reportMarkdown(
  title: string,
  response: PolishResponse,
  judgments: RewriteJudgment[],
  warnings: string[],
  applying = false,
  dryRun = false,
) {
  const cell = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("|", "&#124;")
      .replace(/\r?\n/g, "<br>");
  return [
    `# ${title}`,
    "",
    response.summary,
    "",
    "| id | 元の文 → 案 | 理由 | 判定 |",
    "| --- | --- | --- | --- |",
    ...judgments.map(
      (j) =>
        `| ${cell(j.id)} | ${cell(j.original)} → ${cell(j.verdict === "cut" ? "削除の提案" : (j.rewrite ?? j.original))} | ${cell(j.reason)} | ${cell(j.accepted ? (applying ? (dryRun ? "反映予定" : "反映しました") : "受け入れ可能") : applying ? `反映しません: ${j.rejection ?? "keep のため元の文を保持"}` : (j.rejection ?? "keep"))} |`,
    ),
    "",
    "## missing",
    "",
    ...(response.missing.length ? response.missing.map((s) => `- ${s}`) : ["なし"]),
    "",
    "## offPoint",
    "",
    ...(response.offPoint.length ? response.offPoint.map((s) => `- ${s}`) : ["なし"]),
    ...(warnings.length ? ["", "## 警告", "", ...warnings.map((w) => `- ${w}`)] : []),
    "",
  ].join("\n");
}
export async function polishVideo(args: string[]) {
  const options = argumentsOf(args);
  const key = process.env.GEMINI_API_KEY;
  if (!options.apply && !options.dryRun && !key)
    throw new Error(
      "GEMINI_API_KEY が未設定です。環境変数に設定するか、--dry-run で送信内容を確認してください",
    );
  const topics = collectNarrationTopics(options.selectors).filter((t) =>
    existsSync(join(t.topicDir, "video.json")),
  );
  if (!topics.length) throw new Error("指定した対象に video.json がありません");
  // 複数対象の反映では、保存済み報告とidをすべて確かめてから書き込む。
  const jobs = topics.map((topic) => {
    const title = `${topic.stageSlug}/${topic.id}`,
      file = join(topic.topicDir, "video.json");
    const source = readFileSync(file, "utf8");
    const { storyboard, issues } = parseStoryboard(JSON.parse(source));
    if (!storyboard)
      throw new Error(
        `${title}: 絵コンテの検査エラー: ${issues.map((i) => `${i.path}: ${i.message}`).join(" / ")}`,
      );
    if (!/^[\w-]+$/.test(topic.stageSlug) || !/^[\w-]+$/.test(topic.id))
      throw new Error("出力先のstage・topicIdは英数字とハイフンにしてください");
    const out = join(contentRoot, "dist/video-polish", topic.stageSlug);
    let saved: ReturnType<typeof readSavedPolish> | undefined;
    if (options.apply) {
      let report: unknown;
      try {
        report = JSON.parse(readFileSync(join(out, `${topic.id}.json`), "utf8"));
      } catch {
        throw new Error(
          `${title}: 保存済みの報告を読めません。先に video:polish を実行してください`,
        );
      }
      saved = readSavedPolish(storyboard, report);
    }
    return { topic, title, file, source, storyboard, out, saved };
  });
  // idは対象全体で照合する。別トピックだけにあるidも選択できる。
  selectPolishRewrites(
    jobs.flatMap((job) => job.saved?.judgments ?? []),
    options.selection,
  );
  const guide = options.apply ? "" : readFileSync(join(contentRoot, "VIDEO_GUIDE.md"), "utf8");
  for (const { topic, title, file, source, storyboard, out, saved } of jobs) {
    const request = options.apply ? undefined : buildPolishRequest(storyboard, guide);
    if (options.dryRun && request) {
      console.info(
        `${title} / model: ${options.model}\n\nSYSTEM\n${request.system}\n\nUSER\n${request.user}`,
      );
      continue;
    }
    let model = options.model,
      rawResponse: unknown;
    let response: PolishResponse, judgments: RewriteJudgment[], warnings: string[];
    if (saved) {
      model = saved.model;
      response = saved.response;
      warnings = saved.warnings;
      const ids = new Set(saved.judgments.map((j) => j.id));
      judgments = selectPolishRewrites(saved.judgments, {
        only: options.selection.only?.filter((id) => ids.has(id)),
        skip: options.selection.skip?.filter((id) => ids.has(id)),
      });
    } else {
      rawResponse = await generate(
        model,
        key as string,
        request as ReturnType<typeof buildPolishRequest>,
      );
      const parsed = parsePolishResponse(rawResponse, storyboard);
      if (!parsed.response)
        throw new Error(
          `${title}: 校正応答の検証エラー: ${parsed.issues.map((i) => `${i.path}: ${i.message}`).join(" / ")}`,
        );
      response = parsed.response;
      warnings = parsed.issues
        .filter((i) => i.level === "warning")
        .map((i) => `${i.path}: ${i.message}`);
      judgments = judgeRewrites(storyboard, response);
    }
    const result = options.apply ? applyPolish(storyboard, judgments) : structuredClone(storyboard);
    result.polish = { model, sayHash: sayHash(result) };
    const checked = parseStoryboard(result);
    if (!checked.storyboard)
      throw new Error(
        `${title}: 反映後の検査エラー: ${checked.issues
          .filter((i) => i.level === "error")
          .map((i) => `${i.path}: ${i.message}`)
          .join(" / ")}`,
      );
    const markdown = reportMarkdown(
      `${title} / ${model}`,
      response,
      judgments,
      warnings,
      options.apply,
      options.dryRun,
    );
    if (options.dryRun) {
      console.info(markdown);
      continue;
    }
    if (readFileSync(file, "utf8") !== source)
      throw new Error(`${title}: 校正中にvideo.jsonが変更されたため書き戻しません`);
    // 反映時は読んだ報告を保つ。反映後は入力ハッシュが合わなくなるので再取得が必要。
    if (!options.apply) {
      mkdirSync(out, { recursive: true });
      writeFileSync(
        join(out, `${topic.id}.json`),
        JSON.stringify(
          {
            model,
            sayHash: sayHash(storyboard),
            applied: false,
            rawResponse,
            response,
            judgments,
            warnings,
          },
          null,
          2,
        ) + "\n",
      );
      writeFileSync(join(out, `${topic.id}.md`), markdown);
    }
    writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
    try {
      execFileSync(join(repoRoot, "node_modules/.bin/biome"), ["format", "--write", file], {
        cwd: repoRoot,
        shell: false,
        stdio: "pipe",
      });
    } catch {
      console.warn(`${file}: Biome で整形できませんでした。bun run lint の前に整形してください`);
    }
    console.info(markdown);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  polishVideo(process.argv.slice(2)).catch((error: unknown) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  });
}
