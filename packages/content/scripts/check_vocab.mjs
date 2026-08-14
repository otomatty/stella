#!/usr/bin/env node
/**
 * 語彙台帳チェッカー。
 *
 *   node scripts/check_vocab.mjs [対象パス...]
 *
 * 各トピックの slides.md は front-matter に introduces / requires を持つ。
 * トピックをパス順(= 学習順)に並べ、requires に「それより前で introduces
 * されていない語」が現れたら順序違反としてエラーにする。
 *
 * front-matter に id を持たないファイル(旧レッスン形式)はスキップする。
 */
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { listCourseModuleRoots } from "./course-roots.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 初期語彙は Module 0 が導入するため、暫定の SEED は不要。
const SEED = [];

function collect(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...collect(full));
    else if (entry === "slides.md") found.push(full);
  }
  return found;
}

/** front-matter から id / introduces / requires を取り出す。id が無ければ null。 */
function parseLedger(path) {
  const text = readFileSync(path, "utf8");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = text.slice(0, end);
  const id = /^id:\s*(\S+)\s*$/m.exec(fm)?.[1];
  if (!id) return null;
  const list = (key) => {
    const raw = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m").exec(fm)?.[1] ?? "";
    return raw.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  };
  return { id, path, introduces: list("introduces"), requires: list("requires") };
}

function checkRoots(searchRoots) {
  for (const root of searchRoots) {
    if (!existsSync(root)) {
      console.error(`対象が見つかりません: ${root}`);
      return false;
    }
  }

  const topics = searchRoots
    .flatMap((root) => (statSync(root).isDirectory() ? collect(root) : [root]))
    .sort()
    .map(parseLedger)
    .filter(Boolean);

  if (topics.length === 0) {
    console.log("語彙台帳を持つトピックがありません。チェックをスキップします。");
    return true;
  }

  const known = new Map(SEED.map((w) => [w, "(Module 0)"]));
  const problems = [];

  for (const t of topics) {
    const where = relative(ROOT, t.path);
    for (const word of t.requires) {
      if (!known.has(word)) {
        problems.push(`順序違反: ${where}\n    requires「${word}」がこれより前のトピックで導入されていません`);
      }
    }
    for (const word of t.introduces) {
      if (known.has(word)) {
        problems.push(`重複導入: ${where}\n    「${word}」は ${known.get(word)} で既に導入されています`);
      } else {
        known.set(word, t.id);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`\n語彙台帳チェックで ${problems.length} 件の問題が見つかりました:\n`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error("");
    return false;
  }

  console.log(`語彙台帳チェック OK (${topics.length} トピック / 登録語 ${known.size - SEED.length} 語)`);
  return true;
}

const targets = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (targets.length > 0) {
  if (!checkRoots(targets.map((t) => resolve(ROOT, t)))) process.exit(1);
} else {
  const roots = listCourseModuleRoots();
  if (roots.length === 0) {
    console.error("courses/<slug>/modules が見つかりません。");
    process.exit(1);
  }
  let ok = true;
  for (const root of roots) {
    if (!checkRoots([root])) ok = false;
  }
  if (!ok) process.exit(1);
}
