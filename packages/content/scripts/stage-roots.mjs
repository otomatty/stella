/**
 * stages/<slug>/modules を列挙する。語彙検査・pptx ビルド・図解走査のデフォルト対象。
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sortNatural } from "../src/natural-order.mjs";

export const CONTENT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const STAGES_ROOT = join(CONTENT_ROOT, "stages");

function isDir(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

export function listStageSlugs(stagesRoot = STAGES_ROOT) {
  if (!isDir(stagesRoot)) return [];
  return sortNatural(
    readdirSync(stagesRoot).filter((slug) => isDir(join(stagesRoot, slug, "modules"))),
  );
}

export function listStageModuleRoots(stagesRoot = STAGES_ROOT) {
  return listStageSlugs(stagesRoot).map((slug) => join(stagesRoot, slug, "modules"));
}
