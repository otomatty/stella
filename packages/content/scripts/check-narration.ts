/**
 * 教材動画の台本 (narration.json) の検査。`check:ci` から呼ばれる。
 *
 *   bun run --filter=@stella/content narration:check [stages/<slug> ...]
 *
 * 台本の無いトピックは対象外 (段階導入。設計書の ① 台本 → 検証)。
 * エラーがあれば exit 1、警告は表示だけ。
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { SCREEN_VIDEO_FILES, selectVideoSource } from "../src/material-video.js";
import { formatIssue } from "../src/narration.js";
import { collectNarrationTopics, contentRoot, validateTopic } from "./lib/narration-topics.js";

const selectors = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const topics = collectNarrationTopics(selectors).filter(
  (t) => t.narration !== undefined || t.parseError !== undefined,
);

let errors = 0;
let warnings = 0;
for (const topic of topics) {
  const label = `${topic.stageSlug}/${topic.id}`;
  try {
    const files: Partial<Record<(typeof SCREEN_VIDEO_FILES)[number], Uint8Array>> = {};
    for (const name of SCREEN_VIDEO_FILES) {
      const file = join(topic.topicDir, name);
      if (existsSync(file)) files[name] = readFileSync(file);
    }
    selectVideoSource(files);
  } catch (error) {
    console.log(`✗ ${label}: ${(error as Error).message}`);
    errors++;
  }
  if (topic.parseError !== undefined) {
    console.log(`✗ ${label}: ${topic.parseError} (${relative(contentRoot, topic.narrationFile)})`);
    errors++;
    continue;
  }
  if (!topic.narration) continue;
  for (const issue of validateTopic(topic, topic.narration)) {
    console.log(formatIssue(label, issue));
    if (issue.level === "error") errors++;
    else warnings++;
  }
}

console.log(`narration: ${topics.length} topics checked (${errors} errors, ${warnings} warnings)`);
if (errors > 0) process.exit(1);
