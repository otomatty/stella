/**
 * .claude/skills/<名前>/ を行き先へ写す。
 *
 * node scripts/install-skill.mjs [名前...] [--dest <フォルダー>]
 * 名前の既定は stella-course。行き先の既定は ~/.claude/skills/。
 * 写す前に行き先の同名フォルダーを消す。シンボリックリンクがあると止まって写さない。
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(repoRoot, ".claude", "skills");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const names = [];
  let dest;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dest") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) fail("--dest にフォルダーが必要です");
      dest = value;
      i++;
      continue;
    }
    if (arg.startsWith("--")) fail(`不明な引数です: ${arg}`);
    names.push(arg);
  }
  return {
    names: names.length > 0 ? names : ["stella-course"],
    dest: dest ?? join(homedir(), ".claude", "skills"),
  };
}

function assertNoSymlink(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) fail(`シンボリックリンクは写せません: ${path}`);
    if (stat.isDirectory()) assertNoSymlink(path);
  }
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function installOne(name, destRoot, commit) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    fail(`スキル名は英小文字・数字・ハイフンにしてください: ${name}`);
  }
  const source = join(skillsRoot, name);
  if (!existsSync(source)) fail(`スキルがありません: ${source}`);
  const sourceStat = lstatSync(source);
  if (sourceStat.isSymbolicLink()) fail(`シンボリックリンクは写せません: ${source}`);
  if (!sourceStat.isDirectory()) fail(`スキルがありません: ${source}`);
  assertNoSymlink(source);
  const resolvedSource = realpathSync(source);
  const target = join(realpathSync(destRoot), name);
  const fromSource = relative(resolvedSource, target);
  const fromTarget = relative(target, resolvedSource);
  if (
    fromSource === "" ||
    (!fromSource.startsWith("..") && !isAbsolute(fromSource)) ||
    fromTarget === "" ||
    (!fromTarget.startsWith("..") && !isAbsolute(fromTarget))
  ) {
    fail(`行き先がスキル自身です: ${target}`);
  }
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
  const record = {
    repository: "otomatty/stella",
    ...(commit ? { commit } : {}),
    copiedAt: new Date().toISOString(),
  };
  writeFileSync(join(target, "SOURCE.json"), `${JSON.stringify(record, null, 2)}\n`);
  console.info(target);
}

function main() {
  const { names, dest } = parseArgs(process.argv.slice(2));
  mkdirSync(dest, { recursive: true });
  const commit = gitCommit();
  for (const name of names) installOne(name, dest, commit);
}

main();
