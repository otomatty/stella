import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { resolveReleaseNotesModel, summarizeChangelog } from "./lib/release-notes-ai.js";
import {
  buildDigestMessages,
  buildReleaseBody,
  changelogWithoutShots,
  collectShotNames,
  type DigestEntry,
  extractChangelogSection,
  fallbackSummary,
  isGoogleChatWebhookUrl,
  isHttpsUrl,
  parseChangelogItems,
  type ReleaseItem,
  type ReleaseProduct,
} from "./lib/release-notes.js";

const usage = `使い方
  bun run release:notes prepare --product <web|vscode> --version <v> --changelog <path> --commit <sha> --out-dir <dir> [--images <path>]
  bun run release:notes digest`;

interface Dependencies {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
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
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
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
  images?: string;
}

function isProduct(value: unknown): value is ReleaseProduct {
  return value === "web" || value === "vscode";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseShotUrls(text: string): Map<string, string> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || !isRecord(value.shots)) throw new Error("Invalid image manifest");
  const shotUrls = new Map<string, string>();
  for (const [name, shot] of Object.entries(value.shots)) {
    if (!isRecord(shot) || !isHttpsUrl(shot.url)) throw new Error("Invalid image URL");
    shotUrls.set(name, shot.url);
  }
  return shotUrls;
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

  const { items, errors } = parseChangelogItems(section);
  if (errors.length > 0) {
    for (const error of errors) console.error(`::error::${error}`);
    return 1;
  }

  let shotUrls = new Map<string, string>();
  if (args.images !== undefined) {
    try {
      shotUrls = parseShotUrls(await deps.readFile(args.images));
    } catch {
      console.error("::error::--images の JSON を読み取れないか、画像 URL の形式が不正です");
      return 1;
    }
  }
  for (const name of collectShotNames(items)) {
    if (!shotUrls.has(name)) {
      console.warn(`::warning::${name} のスクリーンショットが無いので、画像なしで載せます`);
    }
  }
  const releaseItems: ReleaseItem[] = items.map(({ title, body, shots }) => ({
    title,
    body,
    images: shots.flatMap(({ name, alt }) => {
      const url = shotUrls.get(name);
      return url === undefined ? [] : [{ url, alt }];
    }),
  }));
  const textSection = changelogWithoutShots(section);
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
        section: textSection,
      });
    } catch {
      // SDK の初期化に失敗したときも CHANGELOG で準備を続ける。
    }
  }
  if (!result) {
    console.warn("::warning::AI の要約を使えなかったので CHANGELOG をそのまま使います");
    result = fallbackSummary(textSection);
  }

  const { summary, points } = result;
  await deps.makeDir(outDir);
  await deps.writeFile(
    join(outDir, "release-body.md"),
    buildReleaseBody({ product, summary, section, commitSha: commit, shotUrls }),
  );
  await deps.writeFile(
    join(outDir, "release-summary.json"),
    `${JSON.stringify({ product, version, points, items: releaseItems }, null, 2)}\n`,
  );
  return 0;
}

const summaryName = "release-summary.json";
const markerName = "release-announced.json";

interface GitHubRelease {
  id: number;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  published_at: string;
  assets: { id: number; name: string }[];
}

function parseReleaseItems(value: unknown): ReleaseItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: ReleaseItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const { title, body, images } = item;
    if (
      (typeof title !== "string" && title !== null) ||
      typeof body !== "string" ||
      !Array.isArray(images)
    ) {
      return null;
    }
    items.push({
      title,
      body,
      images: images
        .flatMap((image: unknown) =>
          isRecord(image) &&
          isHttpsUrl(image.url) &&
          typeof image.alt === "string" &&
          image.alt.trim()
            ? [{ url: image.url, alt: image.alt }]
            : [],
        )
        .slice(0, 2),
    });
  }
  return items;
}

function parseReleaseSummary(
  text: string,
): Pick<DigestEntry, "product" | "version" | "items"> | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    !isRecord(value) ||
    !isProduct(value.product) ||
    typeof value.version !== "string" ||
    !value.version.trim() ||
    !Array.isArray(value.points) ||
    !value.points.every((point: unknown) => typeof point === "string")
  ) {
    return null;
  }
  const { product, version, points } = value;
  const items = parseReleaseItems(value.items);
  if (!items && "items" in value) {
    console.warn(
      `::warning::${product}-v${version} の項目の形式が不正なので、従来の要点を載せます`,
    );
  }
  return {
    product,
    version,
    items: items ?? points.map((body) => ({ title: null, body, images: [] })),
  };
}

async function digest(deps: Dependencies): Promise<number> {
  const repo = deps.env.GITHUB_REPOSITORY;
  if (!repo || !/^[a-z0-9-]+\/[a-z0-9_.-]+$/i.test(repo) || /\/\.{1,2}$/.test(repo)) {
    console.error("::error::GITHUB_REPOSITORY に owner/repo を設定してください");
    return 2;
  }
  const token = deps.env.GH_TOKEN?.trim() || deps.env.GITHUB_TOKEN?.trim();
  if (!token) {
    console.error("::error::GH_TOKEN または GITHUB_TOKEN を設定してください");
    return 2;
  }

  const api = `https://api.github.com/repos/${repo}/releases`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const releases = new Map<number, GitHubRelease>();
  const pending: { release: GitHubRelease; entry: DigestEntry }[] = [];

  try {
    for (let page = 1; page <= 3; page++) {
      const response = await deps.fetch(`${api}?per_page=100&page=${page}`, { headers });
      if (!response.ok) {
        console.error(`::error::GitHub Release の取得に失敗しました (HTTP ${response.status})`);
        return 1;
      }
      const results: GitHubRelease[] = await response.json();
      for (const release of results) releases.set(release.id, release);
      if (results.length < 100) break;
    }

    for (const release of releases.values()) {
      if (
        !/^(web|vscode)-v/.test(release.tag_name) ||
        release.draft ||
        release.prerelease ||
        release.assets.some((asset) => asset.name === markerName)
      ) {
        continue;
      }
      const asset = release.assets.find((asset) => asset.name === summaryName);
      if (!asset) continue;

      const response = await deps.fetch(`${api}/assets/${asset.id}`, {
        headers: { ...headers, Accept: "application/octet-stream" },
      });
      if (!response.ok) {
        console.error(
          `::error::${release.tag_name} の要約を取得できませんでした (HTTP ${response.status})`,
        );
        return 1;
      }
      const summary = parseReleaseSummary(await response.text());
      if (!summary || release.tag_name !== `${summary.product}-v${summary.version}`) {
        console.warn(`::warning::${release.tag_name} の要約の形式または版が不正です`);
        continue;
      }
      pending.push({
        release,
        entry: { ...summary, releaseUrl: release.html_url, publishedAt: release.published_at },
      });
    }
  } catch {
    console.error("::error::GitHub Release または要約を取得できませんでした");
    return 1;
  }

  if (pending.length === 0) {
    console.log("::notice::送る更新情報はありません");
    return 0;
  }
  const url = deps.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!url) {
    console.log("::notice::Google Chat の通知先が未設定なので投稿しません");
    return 0;
  }
  if (!isGoogleChatWebhookUrl(url)) {
    console.error("::error::GOOGLE_CHAT_WEBHOOK_URL が Google Chat の Webhook ではありません");
    return 1;
  }

  const messages = buildDigestMessages(
    pending.map(({ entry }) => entry),
    deps.now(),
  );
  const tags = pending.map(({ release }) => release.tag_name).sort();
  const hash = createHash("sha256").update(tags.join("\n")).digest("hex").slice(0, 24);
  const thread = { threadKey: `stella-release-${hash}` };
  const webhook = new URL(url);
  webhook.searchParams.set("messageReplyOption", "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD");
  try {
    for (const [index, message] of messages.entries()) {
      if (index > 0) await deps.sleep(1100);
      webhook.searchParams.set("messageId", `client-${hash}-${index}`);
      const response = await deps.fetch(webhook.href, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ ...message, thread }),
        signal: AbortSignal.timeout(15_000),
        redirect: "manual",
      });
      if (!response.ok && response.status !== 409) {
        console.error(`::error::HTTP ${response.status}`);
        return 1;
      }
    }
  } catch {
    console.error("::error::HTTP ステータスを取得できませんでした");
    return 1;
  }

  const body = JSON.stringify({ announcedAt: deps.now().toISOString() });
  const uploadUrl = `https://uploads.github.com/repos/${repo}/releases`;
  let uploadFailed = false;
  for (const { release } of pending) {
    let status: number | undefined;
    try {
      const response = await deps.fetch(`${uploadUrl}/${release.id}/assets?name=${markerName}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body,
        redirect: "manual",
      });
      if (response.ok) continue;
      status = response.status;
    } catch {
      // トークンや URL を含みうる例外メッセージは出さない。
    }
    const detail = status === undefined ? "" : ` (HTTP ${status})`;
    console.error(
      `::error::${release.tag_name} に送信済みの印を付けられず、翌日に重ねて送られるかもしれません${detail}`,
    );
    uploadFailed = true;
  }
  return uploadFailed ? 1 : 0;
}

function usageError(): number {
  console.error(usage);
  return 2;
}

export async function main(argv: string[], deps: Dependencies = defaultDeps): Promise<number> {
  const [command, ...args] = argv;
  if (command === "digest") return args.length === 0 ? digest(deps) : usageError();
  if (command !== "prepare") return usageError();
  const names = ["product", "version", "changelog", "commit", "out-dir", "images"];

  let values: Record<string, string | undefined>;
  try {
    const parsed = parseArgs({
      args,
      options: Object.fromEntries(names.map((name) => [name, { type: "string" }])),
      tokens: true,
    });
    if (
      parsed.tokens.some((token) => token.kind !== "option" || token.inlineValue) ||
      new Set(parsed.tokens.map((token) => token.kind === "option" && token.name)).size !==
        parsed.tokens.length
    ) {
      return usageError();
    }
    values = parsed.values;
  } catch {
    return usageError();
  }

  try {
    const { product, version, changelog, commit, "out-dir": outDir, images } = values;
    if (!isProduct(product) || !version?.trim() || !changelog || !commit || !outDir) {
      return usageError();
    }
    return await prepare({ product, version, changelog, commit, outDir, images }, deps);
  } catch {
    console.error("::error::リリースノートを準備できませんでした");
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
