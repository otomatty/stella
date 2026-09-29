/**
 * 台本 (narration.json) の対象トピックを列挙する。台本の下書き (narrate.ts)・検査
 * (check-narration.ts)・動画生成 (build-video.ts) が共用する。
 *
 * トピックの並びは講座ごとのパスの自然順 (= 学習順。check_vocab.mjs・manifest と同じ)。
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  docSectionFor,
  mergeReadings,
  type NarrationFile,
  type NarrationIssue,
  parseNarration,
  type Readings,
  validateNarration,
} from "../../src/narration.js";
import { sortNatural } from "../../src/natural-order.mjs";
import { parseSlides } from "../../src/parse-slides.js";

const here = dirname(fileURLToPath(import.meta.url));
export const contentRoot = resolve(here, "..", "..");
export const coursesRoot = join(contentRoot, "courses");

export interface NarrationTopic {
  courseSlug: string;
  courseTitle: string;
  id: string;
  title: string;
  takeaway: string;
  introduces: string[];
  requires: string[];
  topicDir: string;
  narrationFile: string;
  slidesSource: string;
  /** 台本が無ければ undefined。読めなければ parseError に理由。 */
  narration?: NarrationFile;
  parseError?: string;
  docSection: string;
  nextTopicTitle?: string;
  readings: Readings;
  /** 講座内でこのトピックより前に導入された語 (introduces の累積)。 */
  priorVocabulary: string[];
}

function readJson<T>(file: string, fallback: T): T {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;
}

export function loadGlobalReadings(): Readings {
  return readJson<Readings>(join(contentRoot, "narration", "readings.json"), {});
}

function topicDirsOf(dir: string): string[] {
  const found: string[] = [];
  const walk = (d: string) => {
    if (existsSync(join(d, "slides.md"))) {
      found.push(d);
      return;
    }
    for (const entry of sortNatural(readdirSync(d))) {
      const full = join(d, entry);
      if (statSync(full).isDirectory() && entry !== "assets") walk(full);
    }
  };
  if (existsSync(dir)) walk(dir);
  return found;
}

/**
 * `courses/it-basics`・講座 slug (`it-basics`)・トピックやレッスンのディレクトリの
 * どれでも受け取る。空なら全トピック。
 */
export function matchesSelectors(topicDir: string, selectors: string[]): boolean {
  if (selectors.length === 0) return true;
  return selectors.some((s) => {
    const abs = s.includes("/")
      ? existsSync(resolve(s))
        ? resolve(s)
        : resolve(contentRoot, s)
      : join(coursesRoot, s);
    return topicDir === abs || topicDir.startsWith(`${abs}/`);
  });
}

export function collectNarrationTopics(selectors: string[] = []): NarrationTopic[] {
  const globalReadings = loadGlobalReadings();
  const topics: NarrationTopic[] = [];
  for (const courseSlug of sortNatural(readdirSync(coursesRoot))) {
    const courseDir = join(coursesRoot, courseSlug);
    if (!existsSync(join(courseDir, "course.json"))) continue;
    const course = readJson<{ title: string }>(join(courseDir, "course.json"), {
      title: courseSlug,
    });
    const readings = mergeReadings(
      globalReadings,
      readJson<Readings>(join(courseDir, "narration-readings.json"), {}),
    );
    const dirs = topicDirsOf(join(courseDir, "modules"));
    const vocabulary: string[] = [];
    dirs.forEach((topicDir, i) => {
      const slidesSource = readFileSync(join(topicDir, "slides.md"), "utf8");
      const fm = parseSlides(slidesSource);
      const prior = [...vocabulary];
      vocabulary.push(...fm.introduces);
      if (!matchesSelectors(topicDir, selectors)) return;
      const narrationFile = join(topicDir, "narration.json");
      let narration: NarrationFile | undefined;
      let parseError: string | undefined;
      if (existsSync(narrationFile)) {
        try {
          narration = parseNarration(readFileSync(narrationFile, "utf8"));
        } catch (e) {
          parseError = (e as Error).message;
        }
      }
      const docFile = join(dirname(topicDir), "doc.md");
      const next = dirs[i + 1];
      topics.push({
        courseSlug,
        courseTitle: course.title,
        id: fm.id,
        title: fm.title,
        takeaway: fm.takeaway,
        introduces: fm.introduces,
        requires: fm.requires,
        topicDir,
        narrationFile,
        slidesSource,
        narration,
        parseError,
        docSection: existsSync(docFile) ? docSectionFor(readFileSync(docFile, "utf8"), fm.id) : "",
        nextTopicTitle: next
          ? parseSlides(readFileSync(join(next, "slides.md"), "utf8")).title
          : undefined,
        readings,
        priorVocabulary: prior,
      });
    });
  }
  return topics;
}

export function validateTopic(topic: NarrationTopic, narration: NarrationFile): NarrationIssue[] {
  return validateNarration(narration, {
    slidesSource: topic.slidesSource,
    docSection: topic.docSection,
    nextTopicTitle: topic.nextTopicTitle,
    readings: topic.readings,
  });
}
