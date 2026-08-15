/**
 * packages/content/courses/<slug>/modules/** を走査して、LMS の Course /
 * Section / Lesson と quiz seed を組み立てる。ファイルが正本で、D1 はここから
 * 毎回作り直される。講座を足すときは courses/<slug>/ を増やす。
 *
 * 対応:
 *   courses/<slug>/course.json   → Course
 *   モジュール (m0..)            → Section
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
import type { CourseColor, CourseConfig, QuizSeed } from "./types.js";

/** 既存コード互換。新講座のテナントは course.json の tenantId。 */
export const TENANT_ID = "ses";
/** 既存コード互換。いま入っている講座の slug。 */
export const COURSE_SLUG = "typescript-basics";

const COURSE_COLORS = new Set<CourseColor>(["indigo", "green", "amber", "slate"]);

export function assetPath(courseSlug: string, topicDir: string, fileName: string): string {
  return `tenant/${TENANT_ID}/courses/${courseSlug}/assets/${topicDir}/${fileName}`;
}

function dirsIn(path: string): string[] {
  return readdirSync(path)
    .filter((e) => statSync(join(path, e)).isDirectory())
    .sort();
}

function defaultCoursesRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "courses");
}

function readCourseConfig(courseDir: string, slug: string): CourseConfig & { tenantId: string } {
  const file = join(courseDir, "course.json");
  if (!existsSync(file)) {
    throw new Error(
      `courses/${slug}/course.json がありません。templates/course.json をコピーしてください。`,
    );
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as CourseConfig;
  if (typeof raw.title !== "string" || raw.title.trim() === "") {
    throw new Error(`courses/${slug}/course.json の title が空です。`);
  }
  if (raw.color != null && !COURSE_COLORS.has(raw.color)) {
    throw new Error(`courses/${slug}/course.json の color が不正です: ${raw.color}`);
  }
  return { ...raw, tenantId: raw.tenantId?.trim() || TENANT_ID };
}

/**
 * 相対画像パスを R2 の公開パスへ書き換える。
 *
 * doc.md はレッスンディレクトリから見た `t1-.../assets/x.svg` 形式、
 * slides.md はトピックディレクトリから見た `assets/x.svg` 形式で書かれている。
 * 前者は自分でトピックを名乗るので `topicDir` を渡さず、後者は呼び出し側が渡す。
 */
function rewriteImagePaths(courseSlug: string, markdown: string, topicDir?: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt: string, src: string) => {
    if (/^https?:/.test(src)) return whole;
    const withTopic = /^(t[^/]+)\/assets\/(.+)$/.exec(src);
    if (withTopic) return `![${alt}](${assetPath(courseSlug, withTopic[1], withTopic[2])})`;
    const bare = /^(?:\.\/)?assets\/(.+)$/.exec(src);
    if (bare && topicDir) return `![${alt}](${assetPath(courseSlug, topicDir, bare[1])})`;
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

function buildOneCourse(
  slug: string,
  modulesRoot: string,
  config: CourseConfig & { tenantId: string },
): { course: Course; quizzes: QuizSeed[] } {
  const sections: Section[] = [];
  const quizzes: QuizSeed[] = [];
  const moduleTitles = config.modules ?? {};
  const usedExerciseKeys = new Set<string>();

  for (const moduleDir of dirsIn(modulesRoot)) {
    const modulePath = join(modulesRoot, moduleDir);
    const lessons: Lesson[] = [];

    for (const lessonDir of dirsIn(modulePath)) {
      const lessonPath = join(modulePath, lessonDir);
      const topicDirs = dirsIn(lessonPath);
      const topicIds: string[] = [];

      for (const topicDir of topicDirs) {
        const slidesFile = join(lessonPath, topicDir, "slides.md");
        if (!existsSync(slidesFile)) continue;
        const source = readFileSync(slidesFile, "utf8");
        const fm = parseSlides(source);
        topicIds.push(fm.id);
        // 受講者に渡すのは講師ノートを外した本文だけ。区切りは `---` のまま残し、
        // 何枚に分けるかは描画側が splitSlides で決める。
        // `_class` は build_pptx.py と同じくスライドの見た目の型 (lead / summary) を
        // 決めるので、コメントのまま本文に戻す。描画側 (MarkdownSlides) が型を読んだ
        // あと本文から外す。react-markdown は生 HTML をエスケープして表示してしまうので、
        // 外さずに渡すと受講者にこのコメントが見えてしまう点に注意。
        const body = splitSlides(source)
          .map(
            (s) =>
              (s.cls ? `<!-- _class: ${s.cls} -->\n\n` : "") +
              rewriteImagePaths(slug, s.body, topicDir),
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
        title: `${key} まとめ`,
        type: "text",
        duration: "10分",
        status: "todo",
        markdown: dropPracticeLink(
          rewriteImagePaths(slug, readFileSync(docFile, "utf8").replace(/\r\n/g, "\n")),
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
        quizzes.push({ courseId: slug, lessonId: quizLessonId, passScore: 80, questions });
      }

      // コード演習は VS Code 拡張で解く。course.json の exercises が正本で、
      // assignment 本体は seed が @falcon/shared から引く。
      // レッスン id は assignment id から作る。配列の並び位置を使うと、演習の
      // 挿入・入れ替えで既存 id が別課題を指し、lesson_progress が付け替わる。
      for (const ex of config.exercises?.[key] ?? []) {
        usedExerciseKeys.add(key);
        lessons.push({
          id: `code-${ex.id}`,
          title: ex.title,
          type: "code",
          duration: "10分",
          status: "todo",
          assignmentId: ex.id,
        });
      }
    }

    sections.push({
      id: moduleDir,
      title: moduleTitles[moduleDir] ?? moduleDir,
      lessons,
    });
  }

  // タイポしたキーの演習が黙って消えないように、未使用キーはビルドで落とす。
  const unusedExerciseKeys = Object.keys(config.exercises ?? {}).filter(
    (k) => !usedExerciseKeys.has(k),
  );
  if (unusedExerciseKeys.length > 0) {
    throw new Error(
      `courses/${slug}/course.json の exercises に、対応するレッスンが無いキーがあります: ${unusedExerciseKeys.join(", ")}`,
    );
  }

  const lessonsCount = sections.reduce((n, s) => n + s.lessons.length, 0);

  return {
    course: {
      id: slug,
      title: config.title,
      category: config.category ?? "",
      color: config.color ?? "indigo",
      lessonsCount,
      progress: 0,
      description: config.description,
      sections,
    },
    quizzes,
  };
}

export function buildContentManifest(coursesRoot: string = defaultCoursesRoot()): {
  courses: Course[];
  quizzes: QuizSeed[];
} {
  const courses: Course[] = [];
  const quizzes: QuizSeed[] = [];

  for (const slug of dirsIn(coursesRoot)) {
    const courseDir = join(coursesRoot, slug);
    const modulesRoot = join(courseDir, "modules");
    if (!existsSync(modulesRoot) || !statSync(modulesRoot).isDirectory()) continue;
    const built = buildOneCourse(slug, modulesRoot, readCourseConfig(courseDir, slug));
    courses.push(built.course);
    quizzes.push(...built.quizzes);
  }

  return { courses, quizzes };
}
