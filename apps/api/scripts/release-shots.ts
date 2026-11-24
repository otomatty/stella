import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createRemoteR2Client } from "./lib/release-shots-r2.js";
import {
  collectShotNames,
  extractChangelogSection,
  isHttpsUrl,
  parseChangelogItems,
  type ReleaseProduct,
  stripShotLines,
} from "./lib/release-notes.js";

const bucket = "stella-materials-public";
const shotName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxPngBytes = 5 * 1024 * 1024;

interface Dependencies {
  env: Record<string, string | undefined>;
  readText: (path: string) => Promise<string>;
  readFile: (path: string) => Promise<Uint8Array>;
  listFiles: (dir: string) => Promise<string[]>;
  writeFile: (path: string, content: string) => Promise<void>;
  createClient: typeof createRemoteR2Client;
  sleep: (ms: number) => Promise<void>;
}

const defaultDeps: Dependencies = {
  env: process.env,
  readText: (path) => readFile(path, "utf8"),
  readFile: (path) => readFile(path),
  listFiles: async (dir) =>
    (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name),
  writeFile: (path, content) => writeFile(path, content, "utf8"),
  createClient: createRemoteR2Client,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

function fail(message: string): number {
  console.error(`::error::${message}`);
  return 1;
}

async function list(changelog: string, version: string, deps: Dependencies): Promise<number> {
  const section = extractChangelogSection(await deps.readText(changelog), version);
  if (!section) return fail(`${changelog} に ${version} の節がありません`);

  const { items, errors } = parseChangelogItems(section);
  if (errors.length > 0) {
    for (const error of errors) fail(error);
    return 1;
  }
  console.log(collectShotNames(items).join(","));
  return 0;
}

async function upload(
  {
    product,
    version,
    dir,
    out,
  }: { product: ReleaseProduct; version: string; dir: string; out: string },
  deps: Dependencies,
): Promise<number> {
  const baseUrl = deps.env.MATERIALS_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl?.startsWith("https:") || !isHttpsUrl(baseUrl)) {
    return fail("MATERIALS_BASE_URL に HTTPS の公開 URL を設定してください");
  }

  const shots: Record<string, { url: string }> = {};
  const entries = [];
  for (const filename of (await deps.listFiles(dir)).sort()) {
    if (!filename.endsWith(".png")) continue;
    const name = filename.slice(0, -4);
    if (!shotName.test(name)) return fail(`スクリーンショットのファイル名が不正です: ${filename}`);

    const file = join(dir, filename);
    const body = await deps.readFile(file);
    if (body.byteLength > maxPngBytes) return fail(`${filename} は 5 MB を超えています`);
    const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
    const key = `release-notes/${product}/${version}/${name}-${hash}.png`;
    shots[name] = { url: `${baseUrl}/${key}` };
    entries.push({ key, body });
  }

  if (entries.length > 0) {
    const client = deps.createClient(bucket, deps.env);
    for (const { key, body } of entries) {
      for (let attempt = 1; ; attempt++) {
        try {
          await client.put(key, body, "image/png");
          break;
        } catch (error) {
          if (attempt === 3) throw error;
          await deps.sleep(attempt * 1000);
        }
      }
    }
  }
  await deps.writeFile(out, `${JSON.stringify({ shots }, null, 2)}\n`);
  return 0;
}

const usage = {
  list: "bun run release:shots list --changelog <path> --version <v>",
  strip: "bun run release:shots strip --changelog <path>",
  upload:
    "bun run release:shots upload --product <web|vscode> --version <v> --dir <dir> --out <images.json>",
};

export async function main(argv: string[], deps: Dependencies = defaultDeps): Promise<number> {
  const [command, ...args] = argv;
  if (command !== "list" && command !== "strip" && command !== "upload")
    return fail(`使い方\n  ${Object.values(usage).join("\n  ")}`);
  const names = {
    list: ["changelog", "version"],
    strip: ["changelog"],
    upload: ["product", "version", "dir", "out"],
  }[command];

  let values: Record<string, string | undefined>;
  try {
    ({ values } = parseArgs({
      args,
      options: Object.fromEntries(names.map((name) => [name, { type: "string" }])),
    }));
  } catch {
    return fail(usage[command]);
  }

  const { changelog, version, product, dir, out } = values;
  try {
    if (command === "list") {
      if (!changelog || !version?.trim()) return fail(usage.list);
      return await list(changelog, version, deps);
    }
    if (command === "strip") {
      if (!changelog) return fail(usage.strip);
      const markdown = await deps.readText(changelog);
      await deps.writeFile(changelog, stripShotLines(markdown));
      return 0;
    }
    if ((product !== "web" && product !== "vscode") || !version || !dir || !out) {
      return fail(usage.upload);
    }
    if (!/^[0-9A-Za-z.+-]+$/.test(version) || version === "." || version === "..") {
      return fail("--version の形式が不正です");
    }
    return await upload({ product, version, dir, out }, deps);
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : "";
    return fail(`スクリーンショットの処理に失敗しました${detail}`);
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
