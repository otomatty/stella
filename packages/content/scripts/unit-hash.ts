/**
 * 単元の内容指紋 (`unitContentHash`) を表示する。references.json の `contentHash` と、旧単元の
 * 例外 (`sources/legacy-units.json` の `exemptions`) に記録する値はこれで確かめる (SOURCE_GUIDE.md)。
 *
 *   bun run --filter=@stella/content hash:unit -- dev-env-basics/m0-first-page
 *
 * 引数は `<slug>/<module>` (版の `@…` は無視) か講座の slug。省略すると全単元。ファイルは
 * 書き換えない。版を上げて参照元を確認し直したことは、人が references.json に残す。
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listSourceUnits, unitContentHash } from "../src/check-source-references.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = process.argv.slice(2).map((arg) => arg.replace(/@[^/]*$/, ""));
const units = listSourceUnits(root);
const matches = (unitId: string, target: string) =>
  unitId === target || unitId.startsWith(`${target}/`);
for (const target of targets)
  if (!units.some((unit) => matches(unit.unitId, target))) {
    console.error(`単元がありません: ${target}`);
    process.exitCode = 1;
  }
for (const unit of units)
  if (targets.length === 0 || targets.some((target) => matches(unit.unitId, target)))
    console.log(`${unit.unitId}\t${unitContentHash(unit.directory, unit.environment)}`);
