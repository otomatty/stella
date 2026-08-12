/**
 * packages/content/modules/** を走査して、LMS の Course / Section / Lesson と
 * quiz seed を組み立てる。ファイルが正本で、D1 はここから毎回作り直される。
 *
 * 対応:
 *   モジュール (m0..m9)          → Section
 *   トピック   (t1..)            → Lesson (type: "slides")
 *   レッスンの doc.md            → Lesson (type: "text")
 *   レッスンの practice.md 確認クイズ → Lesson (type: "quiz") + QuizSeed
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Course, Lesson, Section } from "../../../apps/web/src/data/types.js";
import { parseQuiz } from "./parse-quiz.js";
import { parseSlides } from "./parse-slides.js";
import { splitSlides } from "./split-slides.js";
import type { QuizSeed } from "./types.js";

export const TENANT_ID = "ses";
export const COURSE_SLUG = "typescript-basics";

const MATERIAL_PREFIX = `tenant/${TENANT_ID}/courses/${COURSE_SLUG}`;

export function assetPath(topicDir: string, fileName: string): string {
  return `${MATERIAL_PREFIX}/assets/${topicDir}/${fileName}`;
}

const MODULE_TITLES: Record<string, string> = {
  "m0-orientation": "M0. オリエンテーション",
  "m1-values": "M1. 値と変数",
  "m2-conditionals": "M2. 条件分岐とスコープ",
  "m3-data": "M3. 配列とオブジェクト",
  "m4-functions": "M4. 関数",
  "m5-type-system": "M5. 型システム",
  "m6-generics": "M6. ジェネリクス",
  "m7-oop": "M7. クラスとインターフェース",
  "m8-async": "M8. 非同期処理",
  "m9-practice": "M9. 実務への接続",
};

function dirsIn(path: string): string[] {
  return readdirSync(path)
    .filter((e) => statSync(join(path, e)).isDirectory())
    .sort();
}

function defaultRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "modules");
}

/**
 * 相対画像パスを R2 の公開パスへ書き換える。
 *
 * doc.md はレッスンディレクトリから見た `t1-.../assets/x.svg` 形式、
 * slides.md はトピックディレクトリから見た `assets/x.svg` 形式で書かれている。
 * 前者は自分でトピックを名乗るので `topicDir` を渡さず、後者は呼び出し側が渡す。
 */
function rewriteImagePaths(markdown: string, topicDir?: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt: string, src: string) => {
    if (/^https?:/.test(src)) return whole;
    const withTopic = /^(t[^/]+)\/assets\/(.+)$/.exec(src);
    if (withTopic) return `![${alt}](${assetPath(withTopic[1], withTopic[2])})`;
    const bare = /^(?:\.\/)?assets\/(.+)$/.exec(src);
    if (bare && topicDir) return `![${alt}](${assetPath(topicDir, bare[1])})`;
    return whole;
  });
}

/**
 * doc.md 末尾の「演習は [practice.md](practice.md) にあります。」を落とす。
 *
 * LMS に practice.md というリソースは存在せず（中身は `quiz-<key>` レッスンになる）、
 * 演習への導線はレッスン一覧が出す。直前の水平線もこの一文のための区切りなので一緒に落とす。
 */
function dropPracticeLink(markdown: string): string {
  const removed = markdown.replace(
    /(?:\n---)?\n+演習は \[practice\.md\]\(practice\.md\) にあります。\n*/g,
    "\n",
  );
  return `${removed.trimEnd()}\n`;
}

/** レッスンディレクトリ ID (`l1-variables`) と id (`1-1`) から doc/quiz の安定キーを作る。 */
function lessonKey(topicIds: string[]): string {
  // トピック id は "1-1-2" 形式。先頭 2 節がレッスンを表す。
  const first = topicIds[0] ?? "";
  return first.split("-").slice(0, 2).join("-");
}

export function buildContentManifest(root: string = defaultRoot()): {
  courses: Course[];
  quizzes: QuizSeed[];
} {
  const sections: Section[] = [];
  const quizzes: QuizSeed[] = [];

  for (const moduleDir of dirsIn(root)) {
    const modulePath = join(root, moduleDir);
    const lessons: Lesson[] = [];

    for (const lessonDir of dirsIn(modulePath)) {
      const lessonPath = join(modulePath, lessonDir);
      const topicDirs = dirsIn(lessonPath);
      const topicIds: string[] = [];

      for (const topicDir of topicDirs) {
        const slidesFile = join(lessonPath, topicDir, "slides.md");
        if (!existsSync(slidesFile)) continue; // slides.md を持たないディレクトリ
        const source = readFileSync(slidesFile, "utf8");
        const fm = parseSlides(source);
        topicIds.push(fm.id);
        // 受講者に渡すのは講師ノートを外した本文だけ。区切りは `---` のまま残し、
        // 何枚に分けるかは描画側 (Task 10) が splitSlides で決める。
        // `_class` は build_pptx.py と同じくスライドの見た目の型 (lead / summary) を
        // 決めるので、コメントのまま本文に戻す。描画側 (MarkdownSlides) が型を読んだ
        // あと本文から外す。react-markdown は生 HTML をエスケープして表示してしまうので、
        // 外さずに渡すと受講者にこのコメントが見えてしまう点に注意。
        const body = splitSlides(source)
          .map(
            (s) =>
              (s.cls ? `<!-- _class: ${s.cls} -->\n\n` : "") +
              rewriteImagePaths(s.body, topicDir),
          )
          .join("\n\n---\n\n");
        lessons.push({
          id: fm.id,
          title: fm.title,
          type: "slides",
          duration: "3分",
          status: "todo",
          markdown: body,
          totalPages: fm.slideCount,
        });
      }

      const key = lessonKey(topicIds);

      const docFile = join(lessonPath, "doc.md");
      lessons.push({
        id: `doc-${key}`,
        title: `${key} ドキュメント`,
        type: "text",
        duration: "10分",
        status: "todo",
        markdown: dropPracticeLink(
          rewriteImagePaths(readFileSync(docFile, "utf8").replace(/\r\n/g, "\n")),
        ),
      });

      const practiceFile = join(lessonPath, "practice.md");
      const questions = parseQuiz(readFileSync(practiceFile, "utf8"));
      if (questions.length > 0) {
        const quizLessonId = `quiz-${key}`;
        lessons.push({
          id: quizLessonId,
          title: `${key} 確認クイズ`,
          type: "quiz",
          duration: "5分",
          status: "todo",
        });
        quizzes.push({ lessonId: quizLessonId, passScore: 80, questions });
      }
    }

    sections.push({
      id: moduleDir,
      title: MODULE_TITLES[moduleDir] ?? moduleDir,
      lessons,
    });
  }

  const lessonsCount = sections.reduce((n, s) => n + s.lessons.length, 0);

  return {
    courses: [
      {
        id: COURSE_SLUG,
        title: "TypeScript 入門研修",
        category: "プログラミング",
        color: "indigo",
        lessonsCount,
        progress: 0,
        description:
          "未経験からの TypeScript 研修。ショート動画 1 本で 1 つだけ覚える粒度で、値・型・関数・非同期まで通す。",
        sections,
      },
    ],
    quizzes,
  };
}
