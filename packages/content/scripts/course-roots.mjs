/**
 * courses/<slug>/modules を列挙する。語彙検査・pptx ビルド・図解走査のデフォルト対象。
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sortNatural } from "../src/natural-order.mjs";

export const CONTENT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const COURSES_ROOT = join(CONTENT_ROOT, "courses");

function isDir(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

export function listCourseSlugs(coursesRoot = COURSES_ROOT) {
  if (!isDir(coursesRoot)) return [];
  return sortNatural(
    readdirSync(coursesRoot).filter((slug) => isDir(join(coursesRoot, slug, "modules"))),
  );
}

export function listCourseModuleRoots(coursesRoot = COURSES_ROOT) {
  return listCourseSlugs(coursesRoot).map((slug) => join(coursesRoot, slug, "modules"));
}
