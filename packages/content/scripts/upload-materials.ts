/**
 * 教材の画像 (図解 SVG / 講座サムネイル) を R2 へ流す。
 *
 *   bun run --filter=@falcon/content upload                  # local (--local)
 *   bun run --filter=@falcon/content upload:remote           # remote (--remote)
 *   bun run --filter=@falcon/content upload:thumbnails:remote # remote / サムネイルのみ
 *
 * スライド本文と doc.md は D1 の lessons.markdown に入るので、R2 に置くのは
 * 本文から参照される画像だけ。キーは manifest の assetPath() と一致していなければならない。
 *
 * サムネイルのキーは manifest の collectCourseThumbnails() が計算する内容ハッシュ入りの
 * パスで、同じコミットの seed が D1 `courses.thumbnail_path` に書く値と必ず一致する。
 * デプロイ (`.github/workflows/deploy.yml`) は図解・サムネイルの両方をこのスクリプトで流す。
 *
 * `wrangler r2 object put` は 1 ファイルにつき 1 プロセスで、起動だけで数秒かかる。
 * 直列だと図解 68 件で 10 分を超えるので、同時実行数を絞って並列に投げる
 * (`--concurrency=N`、既定 8)。put 自体は冪等なので、失敗時はジョブごと再実行して良い。
 *
 * wrangler は apps/api をカレントディレクトリにして起動する。バケットのローカル実体は
 * `wrangler dev` が使う永続ディレクトリ (apps/api/.wrangler/state) に紐づくので、
 * 別ディレクトリから叩くと dev サーバから見えない場所に書き込んでしまう。
 */

import { execFile } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { assetPath, collectCourseIcons, collectCourseThumbnails } from "../src/manifest.js";
import { sortNatural } from "../src/natural-order.mjs";

const execFileAsync = promisify(execFile);

const BUCKET = "falcon-materials-public";
const remote = process.argv.includes("--remote");
/** 対象の絞り込み。既定は両方。 */
const onlyThumbnails = process.argv.includes("--thumbnails");
const onlyDiagrams = process.argv.includes("--diagrams");
const wantDiagrams = !onlyThumbnails || onlyDiagrams;
const wantThumbnails = !onlyDiagrams || onlyThumbnails;
const here = dirname(fileURLToPath(import.meta.url));
const coursesRoot = join(here, "..", "courses");
const apiDir = join(here, "..", "..", "..", "apps", "api");

async function put(key: string, file: string, contentType: string): Promise<void> {
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
      contentType,
      remote ? "--remote" : "--local",
    ],
    // 並列実行なので出力は混ぜない。失敗したものだけ呼び出し側がまとめて出す。
    { cwd: apiDir, maxBuffer: 8 * 1024 * 1024 },
  );
}

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 同時実行数を絞って走らせる。1 件でも失敗したら全体を失敗にする。
 *
 * リトライは必須。`--local` のバケット実体は miniflare の SQLite で、並列に書くと
 * 数件が "put: Unspecified error (0)" で落ちる。remote 側でも一時的なエラーは起きうる。
 * put は冪等なので、同じキーを投げ直して困ることはない。
 */
async function putAll(entries: Array<[string, Target]>, concurrency: number): Promise<void> {
  const failures: string[] = [];
  let next = 0;
  let done = 0;

  async function worker() {
    for (;;) {
      const index = next++;
      const entry = entries[index];
      if (!entry) return;
      const [key, target] = entry;
      for (let attempt = 1; ; attempt++) {
        try {
          await put(key, target.source, target.contentType);
          break;
        } catch (e) {
          if (attempt >= MAX_ATTEMPTS) {
            failures.push(
              `  ${key} (${attempt} 回試行)\n    ${e instanceof Error ? e.message : String(e)}`,
            );
            break;
          }
          await sleep(attempt * 1000);
        }
      }
      done++;
      if (done % 10 === 0 || done === entries.length) {
        console.log(`  ${done}/${entries.length} …`);
      }
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

function dirsIn(path: string): string[] {
  // 並びは manifest.ts と揃える (自然順)。ここは R2 キーの列挙なので順序に意味は
  // 無いが、走査の対象が同じである以上、片方だけ辞書順にしておく理由も無い。
  return sortNatural(readdirSync(path).filter((e) => statSync(join(path, e)).isDirectory()));
}

/**
 * アップロード対象を先に全部数え上げる。
 *
 * assetPath() のキーは「講座 slug + トピックディレクトリ名 + ファイル名」。
 * 同一講座内でトピック DIR 名が被ると上書きされるので、put の前に検出して止める。
 */
interface Target {
  source: string;
  contentType: string;
}

const targets = new Map<string, Target>();
const collisions: string[] = [];

for (const slug of wantDiagrams ? dirsIn(coursesRoot) : []) {
  const root = join(coursesRoot, slug, "modules");
  if (!existsSync(root)) continue;
  for (const moduleDir of dirsIn(root)) {
    for (const lessonDir of dirsIn(join(root, moduleDir))) {
      const lessonPath = join(root, moduleDir, lessonDir);
      for (const topicDir of dirsIn(lessonPath)) {
        const assetsDir = join(lessonPath, topicDir, "assets");
        if (!existsSync(assetsDir)) continue;
        for (const file of readdirSync(assetsDir).sort()) {
          if (!file.endsWith(".svg")) continue;
          const key = assetPath(slug, topicDir, file);
          const source = join(assetsDir, file);
          const seen = targets.get(key);
          if (seen) {
            collisions.push(`  ${key}\n    ${seen.source}\n    ${source}`);
            continue;
          }
          targets.set(key, { source, contentType: "image/svg+xml" });
        }
      }
    }
  }
}

// スキルツリーのアイコン (courses/<slug>/icon.svg) は講座単位の画像なのでサムネイルと同じ括り。
const thumbnails = wantThumbnails
  ? [...collectCourseThumbnails(coursesRoot), ...collectCourseIcons(coursesRoot)]
  : [];
for (const thumb of thumbnails) {
  targets.set(thumb.key, { source: thumb.sourceFile, contentType: thumb.contentType });
}

if (collisions.length > 0) {
  console.error(
    `R2 のオブジェクトキーが ${collisions.length} 件衝突しています。` +
      "同一講座内でトピックディレクトリ名とファイル名が同じだと同じキーになります。\n" +
      "どちらかのファイル名を変えてください。\n" +
      collisions.join("\n"),
  );
  process.exit(1);
}

if (targets.size === 0) {
  // サムネイル単独の実行では「1 件も無い」は正常。まだ画像を置いていない状態でも
  // デプロイを落とさないよう、警告だけ出して抜ける。
  if (onlyThumbnails) {
    console.log("サムネイル (courses/<slug>/thumbnail.*) は 1 件もありません。何もしません。");
    process.exit(0);
  }
  console.error(
    "アップロード対象が 1 件も見つかりませんでした。courses/<slug>/modules の配置を確認してください。",
  );
  process.exit(1);
}

const concurrencyArg = process.argv.find((a) => a.startsWith("--concurrency="));
const concurrency = Math.max(1, Number(concurrencyArg?.split("=")[1] ?? 8) || 8);

console.log(
  `${targets.size} 件を R2 (${remote ? "remote" : "local"}) へアップロードします ` +
    `(図解 ${targets.size - thumbnails.length} / サムネイル ${thumbnails.length}、同時 ${concurrency})`,
);
await putAll([...targets], concurrency);

console.log(
  `✓ ${targets.size} 件をアップロードしました (図解 ${targets.size - thumbnails.length} / サムネイル ${thumbnails.length})`,
);
