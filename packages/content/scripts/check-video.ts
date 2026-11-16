import { dirname } from "node:path";
import { storyboardAssets } from "./lib/storyboard-assets.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";
import { parseStoryboard } from "../src/video-storyboard.js";

import { sayHash } from "../src/video-polish.js";

const root = resolve(fileURLToPath(new URL("../stages", import.meta.url)));
let errors = 0;
const files = [...globSync("**/video.json", { cwd: root })];
for (const file of files) {
  try {
    const json = JSON.parse(readFileSync(resolve(root, file), "utf8"));
    const assets = storyboardAssets(resolve(root, ".."), dirname(resolve(root, file)), json);
    const result = parseStoryboard(json, assets.context);
    if (result.storyboard && result.storyboard.polish?.sayHash !== sayHash(result.storyboard))
      console.info(`warning: ${file}: 読み上げ文を直したあと video:polish を通していません`);
    for (const issue of result.issues) {
      console.info(`${issue.level}: ${file}:${issue.path}: ${issue.message}`);
      if (issue.level === "error") errors++;
    }
  } catch (e) {
    errors++;
    console.error(`${file}: JSONを読めません: ${(e as Error).message}`);
  }
}
console.info(`絵コンテ ${files.length}件 / エラー ${errors}件`);
if (errors) process.exitCode = 1;
