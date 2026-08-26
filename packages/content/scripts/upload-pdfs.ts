/**
 * 教材 PDF の差分生成 + R2 アップロード + seed 用マニフェスト出力
 * (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 *
 *   bun run --filter=@falcon/content pdf:sync             # local (--local)
 *   bun run --filter=@falcon/content pdf:sync -- --remote # remote (deploy 用)
 *
 * 手順:
 *   1. R2 の状態オブジェクト (`lesson-pdf/state.json`) を読む。前回までに put した
 *      キーの台帳で、キーは内容ハッシュ入り・不変なので「台帳にある = 生成済み」。
 *      Cloudflare v4 API に R2 のオブジェクト一覧が無いため (wrangler も単一
 *      オブジェクトの get/put/delete しか使っていない)、一覧の代わりに台帳を持つ。
 *      deploy は concurrency group で直列なので台帳の競合更新は起きない。
 *   2. build-pdf.ts を台帳のスキップ付きで実行し、変わった教材だけ PDF 化する
 *   3. 台帳に無いキーだけ put する (冪等。旧版は消さない — 版の保持は仕様)
 *   4. 台帳を更新して put し、全対象のマニフェスト (キー・ハッシュ・ファイル名・
 *      サイズ) を書き出す。seed (`PDF_MANIFEST` 環境変数でパスを渡す) がこれを
 *      読んで lesson_materials / lesson_material_versions を登録する
 *
 * バケットは公開 URL を持つため、台帳には生のキーを載せない (PDF_KEY_SALT で
 * キーを推測不能にしても台帳から漏れては意味がない)。キーの SHA-256 → サイズの
 * 表として持ち、スキップ判定は計算したキーをハッシュして照合する。
 *
 * 台帳が読めなかったとき (初回 / 消えた / 一時エラー) は全件生成 + 全件 put に
 * 倒す。キーは content-addressed なので再 put は同内容の上書きで、正しさは
 * 損なわれない (時間だけかかる)。
 */

import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BUCKET = "falcon-materials-public";
const STATE_KEY = "lesson-pdf/state.json";

const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(here, "..");
const apiDir = join(contentRoot, "..", "..", "apps", "api");

const args = process.argv.slice(2);
const remote = args.includes("--remote");
function argValue(name: string): string | null {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}
const manifestOut = resolve(
  contentRoot,
  argValue("--manifest") ?? join("dist", "pdf-manifest.json"),
);
const concurrency = Number(argValue("--concurrency") ?? 8);
/** 講座 slug の絞り込み (ローカル検証用)。build-pdf.ts にそのまま渡す。 */
const courseSlugs = args.filter(
  (a, i) =>
    a !== "--remote" &&
    !a.startsWith("--") &&
    !["--out", "--manifest", "--skip", "--concurrency"].includes(args[i - 1] ?? ""),
);

const outDir = join(contentRoot, "dist", "pdf");

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

interface ManifestEntry {
  tenantId: string;
  courseSlug: string;
  lessonId: string;
  kind: string;
  hash: string;
  key: string;
  fileName: string;
  sizeBytes: number | null;
}

/** R2 上の台帳。objects は sha256(キー) → put 済みオブジェクトのサイズ。 */
interface PdfState {
  version: 1;
  objects: Record<string, number>;
}

function wranglerArgs(cmd: "get" | "put", key: string, file: string): string[] {
  return [
    "wrangler",
    "r2",
    "object",
    cmd,
    `${BUCKET}/${key}`,
    "--file",
    file,
    ...(cmd === "put" ? ["--content-type", "application/json"] : []),
    remote ? "--remote" : "--local",
  ];
}

async function readState(): Promise<PdfState> {
  const tmp = join(contentRoot, "dist", "pdf-state.remote.json");
  rmSync(tmp, { force: true });
  try {
    await execFileAsync("bunx", wranglerArgs("get", STATE_KEY, tmp), {
      cwd: apiDir,
      maxBuffer: 64 * 1024 * 1024,
    });
    const parsed = JSON.parse(readFileSync(tmp, "utf8")) as PdfState;
    if (parsed.version !== 1 || typeof parsed.objects !== "object") {
      throw new Error("unexpected state shape");
    }
    return parsed;
  } catch (e) {
    // 初回は台帳が無いのが正常。それ以外でも全件生成に倒せば正しさは保てるので、
    // 理由を見えるようにして続行する。
    console.warn(
      `台帳 (${STATE_KEY}) を読めませんでした — 全件生成します: ${
        e instanceof Error ? e.message.split("\n")[0] : String(e)
      }`,
    );
    return { version: 1, objects: {} };
  } finally {
    rmSync(tmp, { force: true });
  }
}

async function writeState(state: PdfState): Promise<void> {
  const tmp = join(contentRoot, "dist", "pdf-state.next.json");
  writeFileSync(tmp, JSON.stringify(state));
  await execFileAsync("bunx", wranglerArgs("put", STATE_KEY, tmp), {
    cwd: apiDir,
    maxBuffer: 8 * 1024 * 1024,
  });
  rmSync(tmp, { force: true });
}

async function put(key: string, file: string): Promise<void> {
  await execFileAsync(
    "bunx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${BUCKET}/${key}`,
      "--file",
      file,
      "--content-type",
      "application/pdf",
      remote ? "--remote" : "--local",
    ],
    // 並列実行なので出力は混ぜない。失敗したものだけ呼び出し側がまとめて出す。
    { cwd: apiDir, maxBuffer: 8 * 1024 * 1024 },
  );
}

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** upload-materials.ts と同じ: 同時実行を絞り、リトライし、1 件でも失敗したら全体を失敗にする。 */
async function putAll(entries: Array<{ key: string; file: string }>): Promise<void> {
  const failures: string[] = [];
  let next = 0;
  let done = 0;
  async function worker() {
    for (;;) {
      const entry = entries[next++];
      if (!entry) return;
      for (let attempt = 1; ; attempt++) {
        try {
          await put(entry.key, entry.file);
          break;
        } catch (e) {
          if (attempt >= MAX_ATTEMPTS) {
            failures.push(
              `  ${entry.key} (${attempt} 回試行)\n    ${e instanceof Error ? e.message : String(e)}`,
            );
            break;
          }
          await sleep(attempt * 1000);
        }
      }
      done++;
      if (done % 10 === 0 || done === entries.length) console.log(`  ${done}/${entries.length} …`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  if (failures.length > 0) {
    console.error(
      `\nR2 へのアップロードが ${failures.length} 件失敗しました:\n${failures.join("\n")}`,
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  mkdirSync(join(contentRoot, "dist"), { recursive: true });
  const state = await readState();
  console.log(
    `台帳の既存 PDF: ${Object.keys(state.objects).length} 件 (${remote ? "remote" : "local"})`,
  );

  // build-pdf.ts へのスキップ指定は生のキーではなくキーの SHA-256 (台帳と同じ形)。
  const skipFile = join(contentRoot, "dist", "pdf-existing-keys.txt");
  writeFileSync(skipFile, `${Object.keys(state.objects).join("\n")}\n`);

  const rawManifest = join(contentRoot, "dist", "pdf-manifest.raw.json");
  const build = spawnSync(
    "bun",
    ["run", "scripts/build-pdf.ts", ...courseSlugs, "--skip", skipFile, "--manifest", rawManifest],
    { cwd: contentRoot, stdio: "inherit" },
  );
  if (build.status !== 0) {
    throw new Error(`build-pdf.ts failed (exit ${build.status})`);
  }

  const entries = JSON.parse(readFileSync(rawManifest, "utf8")) as ManifestEntry[];
  const uploads: Array<{ key: string; file: string }> = [];
  for (const e of entries) {
    if (state.objects[sha256(e.key)] !== undefined) continue;
    const file = join(outDir, e.key);
    if (!existsSync(file)) {
      throw new Error(`生成されたはずの PDF がありません: ${file}`);
    }
    uploads.push({ key: e.key, file });
  }
  console.log(`アップロード対象: ${uploads.length} 件`);
  if (uploads.length > 0) await putAll(uploads);

  const finalEntries = entries.map((e) => {
    const local = join(outDir, e.key);
    const sizeBytes =
      state.objects[sha256(e.key)] ?? (existsSync(local) ? statSync(local).size : null);
    if (sizeBytes === null) throw new Error(`サイズを決定できません: ${e.key}`);
    return { ...e, sizeBytes };
  });

  // 台帳の更新は全 put が成功してから。旧エントリは残す (A→B→A の巻き戻しで
  // 旧キーに戻ったとき、再生成せずスキップできる)。
  const merged: PdfState = { version: 1, objects: { ...state.objects } };
  for (const e of finalEntries) {
    if (typeof e.sizeBytes === "number") merged.objects[sha256(e.key)] = e.sizeBytes;
  }
  await writeState(merged);

  writeFileSync(manifestOut, `${JSON.stringify(finalEntries, null, 2)}\n`);
  console.log(`✓ manifest: ${manifestOut} (${finalEntries.length} 件)`);
}

await main();
