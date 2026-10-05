/**
 * 旧単元の基準 (`sources/legacy-units.json`) を、記録済みの `baseCommit` の教材から作り直す。
 * 指紋の計算方法を変えたときだけ使い、教材を改訂したときには実行しない (SOURCE_GUIDE.md)。
 *
 *   bun run --filter=@stella/content baseline:legacy
 *
 * 教材 (`packages/content/courses`) と旧演習の課題定義 (`packages/shared/src`) を `baseCommit`
 * から一時ディレクトリへ取り出し、いまの指紋の計算で読む。課題定義もその時点の版を引くので、
 * 導入後に同じ ID のまま課題を直した単元は改訂済みとして残る。
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createLegacyBaseline,
  type LegacySourceBaseline,
  type SharedAssignmentModules,
  sharedAssignmentResolver,
} from "../src/check-source-references.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "sources/legacy-units.json");
const recorded = JSON.parse(readFileSync(file, "utf8")) as LegacySourceBaseline;
if (!/^[0-9a-f]{40}$/.test(recorded.baseCommit))
  throw new Error("sources/legacy-units.json の baseCommit に commit の SHA が必要です");
const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const work = mkdtempSync(join(tmpdir(), "stella-legacy-baseline-"));
try {
  const archive = join(work, "base.tar");
  execFileSync(
    "git",
    [
      "archive",
      "--format=tar",
      `--output=${archive}`,
      recorded.baseCommit,
      "--",
      "packages/content/courses",
      "packages/shared/src",
    ],
    { cwd: repo, stdio: "inherit" },
  );
  execFileSync("tar", ["-xf", archive, "-C", work], { stdio: "inherit" });
  const shared = join(work, "packages/shared/src");
  const modules = {
    ...(await import(pathToFileURL(join(shared, "problems/index.ts")).href)),
    ...(await import(pathToFileURL(join(shared, "assignment-helpers.ts")).href)),
  } as SharedAssignmentModules;
  const baseline = createLegacyBaseline(
    join(work, "packages/content"),
    recorded.baseCommit,
    sharedAssignmentResolver(modules),
  );
  // 例外は人が差分を確かめた記録なので消さない。旧い計算の指紋に結び付いたものは効かなくなる。
  baseline.exemptions = recorded.exemptions;
  writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);
  const changed = Object.keys(baseline.units).filter(
    (unitId) => recorded.units[unitId] !== baseline.units[unitId],
  );
  console.log(
    `旧単元の基準: ${Object.keys(baseline.units).length} 単元 (指紋が変わった単元 ${changed.length} 件)`,
  );
  for (const unitId of changed) console.log(`  ${unitId}`);
  if (baseline.exemptions.length > 0)
    console.warn(
      `例外 ${baseline.exemptions.length} 件は以前の計算の contentHash です。差分を確かめ直して更新してください。`,
    );
} finally {
  rmSync(work, { recursive: true, force: true });
}
