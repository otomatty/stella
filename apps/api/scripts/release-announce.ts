import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { resolveReleaseNotesModel, summarizeChangelog } from "./lib/release-notes-ai.js";
import {
  buildChatMessage,
  buildReleaseBody,
  extractChangelogSection,
  fallbackSummary,
  isGoogleChatWebhookUrl,
  type ReleaseProduct,
} from "./lib/release-notes.js";

const usage = `使い方
  bun run release:notes prepare --product <web|vscode> --version <v> --changelog <path> --commit <sha> --out-dir <dir>
  bun run release:notes notify --summary <path> --release-url <https://github.com/...>`;

interface Dependencies {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  makeDir: (path: string) => Promise<unknown>;
  createClient: (options: {
    apiKey: string;
    timeout: number;
    maxRetries: number;
  }) => Pick<Anthropic, "beta">;
}

const defaultDeps: Dependencies = {
  env: process.env,
  fetch: (url, init) => fetch(url, init),
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, content) => writeFile(path, content, "utf8"),
  makeDir: (path) => mkdir(path, { recursive: true }),
  createClient: (options) => new Anthropic(options),
};

interface PrepareArgs {
  product: ReleaseProduct;
  version: string;
  changelog: string;
  commit: string;
  outDir: string;
}

function isProduct(value: unknown): value is ReleaseProduct {
  return value === "web" || value === "vscode";
}

async function prepare(args: PrepareArgs, deps: Dependencies): Promise<number> {
  const { product, version, changelog, commit, outDir } = args;
  const section = extractChangelogSection(await deps.readFile(changelog), version);
  if (!section) {
    console.error(
      `::error::${changelog} に ${version} の節がありません。リリースする前に変更内容を書いてください`,
    );
    return 1;
  }

  const apiKey = deps.env.ANTHROPIC_API_KEY;
  let result: Awaited<ReturnType<typeof summarizeChangelog>> = null;
  if (apiKey) {
    try {
      const client = deps.createClient({ apiKey, timeout: 60_000, maxRetries: 2 });
      result = await summarizeChangelog({
        client,
        model: resolveReleaseNotesModel(deps.env),
        product,
        version,
        section,
      });
    } catch {
      // SDK の初期化に失敗したときも CHANGELOG で準備を続ける。
    }
  }
  if (!result) {
    console.warn("::warning::AI の要約を使えなかったので CHANGELOG をそのまま使います");
    result = fallbackSummary(section);
  }

  const { summary, points } = result;
  await deps.makeDir(outDir);
  await deps.writeFile(
    join(outDir, "release-body.md"),
    buildReleaseBody({ product, summary, section, commitSha: commit }),
  );
  await deps.writeFile(
    join(outDir, "release-summary.json"),
    `${JSON.stringify({ product, version, points }, null, 2)}\n`,
  );
  return 0;
}

async function notify(
  summaryPath: string,
  releaseUrl: string,
  deps: Dependencies,
): Promise<number> {
  const url = deps.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!url) {
    console.log("::notice::Google Chat の通知先が未設定なので投稿しません");
    return 0;
  }
  if (!isGoogleChatWebhookUrl(url)) {
    console.error("::error::GOOGLE_CHAT_WEBHOOK_URL が Google Chat の Webhook ではありません");
    return 1;
  }

  const value: unknown = JSON.parse(await deps.readFile(summaryPath));
  if (
    typeof value !== "object" ||
    value === null ||
    !("product" in value) ||
    !isProduct(value.product) ||
    !("version" in value) ||
    typeof value.version !== "string" ||
    !value.version.trim() ||
    !("points" in value) ||
    !Array.isArray(value.points) ||
    !value.points.every((point: unknown) => typeof point === "string")
  ) {
    console.error("::error::リリース要約の形式が不正です");
    return 1;
  }

  const { product, version, points } = value;
  const text = buildChatMessage({ product, version, points, releaseUrl });
  try {
    const response = await deps.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
      redirect: "manual",
    });
    if (response.ok) return 0;
    console.error(`::error::HTTP ${response.status}`);
  } catch {
    console.error("::error::HTTP ステータスを取得できませんでした");
  }
  return 1;
}

function usageError(): number {
  console.error(usage);
  return 2;
}

export async function main(argv: string[], deps: Dependencies = defaultDeps): Promise<number> {
  const [command, ...args] = argv;
  const names =
    command === "prepare"
      ? ["product", "version", "changelog", "commit", "out-dir"]
      : ["summary", "release-url"];
  if (command !== "prepare" && command !== "notify") return usageError();

  let values: Record<string, string | undefined>;
  try {
    const parsed = parseArgs({
      args,
      options: Object.fromEntries(names.map((name) => [name, { type: "string" }])),
      tokens: true,
    });
    if (
      parsed.tokens.some((token) => token.kind !== "option" || token.inlineValue) ||
      parsed.tokens.length !== names.length
    ) {
      return usageError();
    }
    values = parsed.values;
  } catch {
    return usageError();
  }

  try {
    if (command === "prepare") {
      const { product, version, changelog, commit, "out-dir": outDir } = values;
      if (!isProduct(product) || !version?.trim() || !changelog || !commit || !outDir) {
        return usageError();
      }
      return await prepare({ product, version, changelog, commit, outDir }, deps);
    }

    const { summary, "release-url": releaseUrl } = values;
    if (
      !summary ||
      !releaseUrl?.startsWith("https://github.com/") ||
      !URL.canParse(releaseUrl) ||
      /[\s<>|]/.test(releaseUrl)
    ) {
      return usageError();
    }
    return await notify(summary, releaseUrl, deps);
  } catch {
    console.error(
      command === "prepare"
        ? "::error::リリースノートを準備できませんでした"
        : "::error::リリース要約を読み取れませんでした",
    );
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
