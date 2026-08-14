/**
 * 教材の図解 SVG を R2 へ流す。
 *
 *   bun run --filter=@falcon/content upload            # local (--local)
 *   bun run --filter=@falcon/content upload:remote     # remote (--remote)
 *
 * スライド本文と doc.md は D1 の lessons.markdown に入るので、R2 に置くのは
 * 本文から参照される画像だけ。キーは manifest の assetPath() と一致していなければならない。
 *
 * wrangler は apps/api をカレントディレクトリにして起動する。バケットのローカル実体は
 * `wrangler dev` が使う永続ディレクトリ (apps/api/.wrangler/state) に紐づくので、
 * 別ディレクトリから叩くと dev サーバから見えない場所に書き込んでしまう。
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assetPath } from "../src/manifest.js";

const BUCKET = "falcon-materials-public";
const remote = process.argv.includes("--remote");
const here = dirname(fileURLToPath(import.meta.url));
const coursesRoot = join(here, "..", "courses");
const apiDir = join(here, "..", "..", "..", "apps", "api");

function put(key: string, file: string, contentType: string) {
  execFileSync(
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
    { cwd: apiDir, stdio: "inherit" },
  );
}

function dirsIn(path: string): string[] {
  return readdirSync(path)
    .filter((e) => statSync(join(path, e)).isDirectory())
    .sort();
}

/**
 * アップロード対象を先に全部数え上げる。
 *
 * assetPath() のキーは「講座 slug + トピックディレクトリ名 + ファイル名」。
 * 同一講座内でトピック DIR 名が被ると上書きされるので、put の前に検出して止める。
 */
const targets = new Map<string, string>();
const collisions: string[] = [];

for (const slug of dirsIn(coursesRoot)) {
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
            collisions.push(`  ${key}\n    ${seen}\n    ${source}`);
            continue;
          }
          targets.set(key, source);
        }
      }
    }
  }
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
  console.error("SVG が 1 件も見つかりませんでした。courses/<slug>/modules の配置を確認してください。");
  process.exit(1);
}

for (const [key, source] of targets) {
  put(key, source, "image/svg+xml");
}

console.log(`✓ SVG ${targets.size} 件をアップロードしました`);
