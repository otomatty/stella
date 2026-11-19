import { globSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMMENT_ONLY_CODE_WARNING } from "../src/scene-code.js";
import { sayHash } from "../src/video-polish.js";
import { parseStoryboard } from "../src/video-storyboard.js";
import { storyboardAssets } from "./lib/storyboard-assets.js";

export function narrationOnlyFiles(files: readonly string[]): string[] {
  const available = new Set(files);
  return files.filter((file) => {
    if (basename(file) !== "narration.json") return false;
    const dir = dirname(file);
    return !available.has(join(dir, "video.json")) && !available.has(join(dir, "screen.mp4"));
  });
}

if (import.meta.main) {
  const root = resolve(fileURLToPath(new URL("../stages", import.meta.url)));
  const files = globSync("**/{narration.json,video.json,screen.mp4}", {
    cwd: root,
    withFileTypes: true,
  })
    .filter((entry) => !entry.isDirectory())
    .map((entry) => relative(root, resolve(root, entry.parentPath, entry.name)))
    .sort();
  const storyboards = files.filter((file) => basename(file) === "video.json");
  let errors = 0;
  let commentOnlyWarnings = 0;
  for (const file of storyboards) {
    try {
      const json = JSON.parse(readFileSync(resolve(root, file), "utf8"));
      const assets = storyboardAssets(resolve(root, ".."), dirname(resolve(root, file)), json);
      const result = parseStoryboard(json, assets.context);
      if (result.storyboard && result.storyboard.polish?.sayHash !== sayHash(result.storyboard))
        console.info(`warning: ${file}: 読み上げ文を直したあと video:polish を通していません`);
      for (const issue of result.issues) {
        console.info(`${issue.level}: ${file}:${issue.path}: ${issue.message}`);
        if (issue.level === "error") errors++;
        else if (issue.message === COMMENT_ONLY_CODE_WARNING) commentOnlyWarnings++;
      }
    } catch (e) {
      errors++;
      console.error(`${file}: JSONを読めません: ${(e as Error).message}`);
    }
  }
  const slideVideos = narrationOnlyFiles(files);
  for (const file of slideVideos)
    console.info(
      `warning: ${file}: スライドを読み上げるだけの動画です。video.json に置き換えてください`,
    );
  console.info(
    `絵コンテ ${storyboards.length}件 / エラー ${errors}件 / コメントと空行だけの code の警告 ${commentOnlyWarnings}件 / スライド版の警告 ${slideVideos.length}件`,
  );
  if (errors) process.exitCode = 1;
}
