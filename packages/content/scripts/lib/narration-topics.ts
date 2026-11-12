/**
 * 台本 (narration.json) の対象トピックを列挙する。台本の下書き (narrate.ts)・検査
 * (check-narration.ts)・動画生成 (build-video.ts) が共用する。
 *
 * トピックの並びはステージごとのパスの自然順 (= 学習順。check_vocab.mjs・manifest と同じ)。
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
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
export const stagesRoot = join(contentRoot, "stages");

export interface NarrationTopic {
  stageSlug: string;
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
  /** ステージ内でこのトピックより前に導入された語 (introduces の累積)。 */
  priorVocabulary: string[];
}

function readJson<T>(file: string, fallback: T): T {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;
}

/**
 * 読み辞書 (`{ "表記": "読み" }`) を読む。ファイルが無ければ空の辞書。
 *
 * 値が文字列でないと読み上げ文に `123` や `[object Object]` が混ざり、空だと表記が
 * 消える。どちらも合成までは静かに通ってしまうので、読んだ時点で弾く。
 */
export function loadReadings(file: string): Readings {
  if (!existsSync(file)) return {};
  const shown = relative(contentRoot, file).startsWith("..") ? file : relative(contentRoot, file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${shown}: 読み辞書の JSON を読めません (${(e as Error).message})`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${shown}: 読み辞書は { "表記": "読み" } のオブジェクトにしてください`);
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error(`${shown}: "${key}" の読みが文字列ではありません (${JSON.stringify(value)})`);
    }
    if (value.trim() === "") {
      throw new Error(`${shown}: "${key}" の読みが空です`);
    }
  }
  // 検査だけして、パース結果をそのまま返す (`{}` へ写すと `__proto__` のキーが消える)。
  return parsed as Readings;
}

export function loadGlobalReadings(): Readings {
  return loadReadings(join(contentRoot, "narration", "readings.json"));
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
 * `stages/it-basics`・ステージ slug (`it-basics`)・トピックやレッスンのディレクトリの
 * どれでも受け取る。空なら全トピック。
 */
export function matchesSelectors(topicDir: string, selectors: string[]): boolean {
  if (selectors.length === 0) return true;
  return selectors.some((s) => {
    const abs =
      isAbsolute(s) || s.includes("/") || s.includes(sep)
        ? existsSync(resolve(s))
          ? resolve(s)
          : resolve(contentRoot, s)
        : join(stagesRoot, s);
    return topicDir === abs || topicDir.startsWith(`${abs}${sep}`);
  });
}

export function collectNarrationTopics(selectors: string[] = []): NarrationTopic[] {
  const globalReadings = loadGlobalReadings();
  const topics: NarrationTopic[] = [];
  for (const stageSlug of sortNatural(readdirSync(stagesRoot))) {
    const stageDir = join(stagesRoot, stageSlug);
    if (!existsSync(join(stageDir, "stage.json"))) continue;
    const stage = readJson<{ title: string }>(join(stageDir, "stage.json"), {
      title: stageSlug,
    });
    const readings = mergeReadings(
      globalReadings,
      loadReadings(join(stageDir, "narration-readings.json")),
    );
    const dirs = topicDirsOf(join(stageDir, "modules"));
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
        stageSlug,
        courseTitle: stage.title,
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
