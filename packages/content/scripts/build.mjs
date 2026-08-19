#!/usr/bin/env node
/**
 * 全レッスンの slides.md から編集可能な .pptx を生成する。
 *
 *   node scripts/build.mjs [対象パス...] [--check-only]
 *
 * --check-only を渡すと Python を起動せず、Node だけで走る検査で打ち切る(CI 用)。
 *
 * 対象パスを省略すると courses/<slug>/modules 配下の全レッスンをビルドする。
 * 全体ビルド時は check_thumbnails.mjs(講座サムネイルの寸法・容量の検査)も走る。
 *
 * 4段構成: check_vocab.mjs(語彙台帳の検査)→ lint-skin.py(図解トークンの検査)→
 *           diagram_export.py(図解のSVG/PNG生成とはみ出し検査)→ build_pptx.py(python-pptxで再構築)
 */
import {
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { join, resolve, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { listCourseModuleRoots } from "./course-roots.mjs";
import { compareNatural } from "../src/natural-order.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const targets = process.argv.slice(2).filter((a) => !a.startsWith("--"));

/** ディレクトリを再帰的に走査して、指定した名前のファイルを集める */
function collect(dir, name) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collect(full, name));
    } else if (entry === name) {
      found.push(full);
    }
  }
  return found;
}

/**
 * doc.md / practice.md が参照している画像の実在を確認する。
 * slides.md の画像は build_pptx.py が読み込む段階で落ちるが、
 * これらはビルド対象外なので、リンク切れのままLMSに出てしまう。
 */
function checkDocImages(roots) {
  const problems = [];
  for (const root of roots) {
    if (!statSync(root).isDirectory()) continue;
    for (const name of ["doc.md", "practice.md"]) {
      for (const file of collect(root, name)) {
        const dir = dirname(file);
        for (const m of readFileSync(file, "utf8").matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
          const src = m[1];
          if (/^https?:/.test(src)) continue;
          if (!existsSync(join(dir, src))) {
            problems.push(`${relative(ROOT, file)} -> ${src}`);
          }
        }
      }
    }
  }
  return problems;
}

const searchRoots =
  targets.length > 0 ? targets.map((t) => resolve(ROOT, t)) : listCourseModuleRoots();

for (const root of searchRoots) {
  if (!existsSync(root)) {
    console.error(`対象が見つかりません: ${root}`);
    process.exit(1);
  }
}

const slides = searchRoots
  .flatMap((root) => (statSync(root).isDirectory() ? collect(root, "slides.md") : [root]))
  // 収録順 = パスの自然順。辞書順だと m10 が m1 と m2 の間に入る。
  .sort(compareNatural);

const brokenImages = checkDocImages(searchRoots);
if (brokenImages.length > 0) {
  console.error(
    `\ndoc.md / practice.md に存在しない画像への参照が ${brokenImages.length} 件あります:\n`,
  );
  for (const p of brokenImages) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}

// 1トピック = 4〜6スライド(STYLE_GUIDE.md)。超えたら分割、足りなければ内容不足のサイン。
// front-matter を持つトピック形式だけを対象にする。
const slideCountViolations = slides.flatMap((path) => {
  const text = readFileSync(path, "utf8");
  if (!/^id:\s*\S+\s*$/m.test(text.slice(0, text.indexOf("\n---", 3) + 1))) return [];
  const n = text.slice(text.indexOf("\n---", 3) + 4).split(/\r?\n---\r?\n/).length;
  return n < 4 || n > 6 ? [`${relative(ROOT, path)} — ${n}枚`] : [];
});
if (slideCountViolations.length > 0) {
  console.error(
    `\nスライド枚数が規定(4〜6枚)から外れたトピックが ${slideCountViolations.length} 件あります:\n`,
  );
  for (const p of slideCountViolations) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}

if (slides.length === 0) {
  console.error("ビルド対象の slides.md が見つかりませんでした。");
  process.exit(1);
}

const vocab = spawnSync(
  "node",
  [
    join(ROOT, "scripts", "check_vocab.mjs"),
    // 対象未指定なら check_vocab 側で講座ごとに検査する（混ぜると語彙が干渉する）。
    ...(targets.length > 0 ? searchRoots : []),
  ],
  { encoding: "utf8", stdio: "inherit" },
);
if (vocab.status !== 0) process.exit(vocab.status ?? 1);

// 講座サムネイルは講座単位 (modules の外) なので、対象を絞らない全体ビルドでだけ検査する。
if (targets.length === 0) {
  const thumbs = spawnSync("node", [join(ROOT, "scripts", "check_thumbnails.mjs")], {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (thumbs.status !== 0) process.exit(thumbs.status ?? 1);
}

// ここまでが Node だけで走る検査(画像リンク・スライド枚数・語彙台帳・サムネイル)。CI はここで打ち切る。
if (process.argv.includes("--check-only")) process.exit(0);

console.log(`${slides.length} 件のスライドを pptx でビルドします\n`);

// 図解の生成より先に差分判定をしてはいけない(PNGが更新されると pptx も作り直しが要るため)
// PYTHONUTF8: Windows既定のANSIコードページでは日本語メッセージが文字化けするため、
// Python側の標準入出力・ファイルI/OをUTF-8に固定する。
const SKILL_DIR = join(ROOT, "..", "..", ".claude", "skills", "diagram-design");
const lint = spawnSync("python", [join(SKILL_DIR, "lint-skin.py"), ...searchRoots], {
  encoding: "utf8",
  stdio: "inherit",
  env: { ...process.env, PYTHONUTF8: "1" },
});
if (lint.status !== 0) process.exit(lint.status ?? 1);

const raster = spawnSync("python", [join(ROOT, "scripts", "diagram_export.py"), ...searchRoots], {
  encoding: "utf8",
  stdio: "inherit",
  env: { ...process.env, PYTHONUTF8: "1" },
});
if (raster.status !== 0) process.exit(raster.status ?? 1);

const mtime = (p) => (existsSync(p) ? statSync(p).mtimeMs : 0);

/**
 * pptx を作り直す必要があるか。
 * 依存は slides.md・assets 配下の全ファイル・build_pptx.py の3つ。
 * build_pptx.py は見た目(配色・フォント・レイアウト)の正本なので、
 * 触ったら全トピックが作り直しになる。
 */
const GENERATOR = join(ROOT, "scripts", "build_pptx.py");
function isStale(slidePath) {
  const dir = dirname(slidePath);
  const out = mtime(join(dir, "slides.pptx"));
  if (out === 0) return true;
  if (mtime(slidePath) > out || mtime(GENERATOR) > out) return true;
  const assets = join(dir, "assets");
  if (!existsSync(assets)) return false;
  return readdirSync(assets).some((f) => mtime(join(assets, f)) > out);
}

const force = process.argv.includes("--force");
const stale = force ? slides : slides.filter(isStale);
const skipped = slides.length - stale.length;

if (stale.length > 0) {
  const gen = spawnSync("python", [join(ROOT, "scripts", "build_pptx.py"), ...stale], {
    encoding: "utf8",
    stdio: "inherit",
  });
  if ((gen.status ?? 1) !== 0) process.exit(gen.status ?? 1);
}
if (skipped > 0) console.log(`pptx: ${skipped} 件スキップ(最新)`);

/**
 * 収録・アップロード用のファイル名を決める。
 * トピック形式は front-matter の id を先頭に付ける(例: 1-1-2-const-and-let.pptx)。
 * ファイル名を自然順に並べると収録順になり、スライド・doc.md の見出しとIDが一致する。
 * id を持たない旧形式は、衝突しないよう courses 配下の相対パスを連結する。
 */
function courseSlugFromSlide(slidePath) {
  const rel = relative(join(ROOT, "courses"), slidePath);
  if (!rel || rel.startsWith("..")) return null;
  return rel.split(/[\\/]/)[0];
}

function distName(slidePath) {
  const dir = dirname(slidePath);
  const id = /^id:\s*(\S+)\s*$/m.exec(readFileSync(slidePath, "utf8").split("\n---")[0])?.[1];
  const slug = courseSlugFromSlide(slidePath);
  if (id) {
    const topic = `${id}-${basename(dir).replace(/^t\d+-/, "")}`;
    return slug ? `${slug}-${topic}` : topic;
  }
  return relative(join(ROOT, "courses"), dir).split(/[\\/]/).join("_");
}

// Google Slides等へ一括アップロードしやすいよう、名前を付けて1フォルダに集める
// (出力はすべて slides.pptx という同名のため、そのままでは一括で扱えない)
const distDir = join(ROOT, "dist", "slides");
// 全体ビルドのときだけ、前回の出力(構成変更で名前が変わった分)を捨ててから作り直す。
// 単一レッスンのプレビュー時に他の出力を消さないよう、対象指定があるときは残す。
if (targets.length === 0) rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
const used = new Map();
for (const slidePath of slides) {
  const name = distName(slidePath);
  if (used.has(name)) {
    console.error(`dist名が衝突しました: ${name}.pptx\n  ${used.get(name)}\n  ${slidePath}`);
    process.exit(1);
  }
  used.set(name, slidePath);
  copyFileSync(join(dirname(slidePath), "slides.pptx"), join(distDir, `${name}.pptx`));
}

console.log(`\n完了: ${stale.length} 件を再生成、${skipped} 件は最新(計 ${slides.length} 件)。`);
console.log("出力先: 各トピックフォルダ内の slides.pptx");
console.log(`一括アップロード用: dist/slides/ (${slides.length} 本。ファイル名の自然順 = 収録順)`);
