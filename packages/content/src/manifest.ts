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

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Course, Lesson, Section } from "../../../apps/web/src/data/types.js";
import { sortNatural } from "./natural-order.mjs";
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

/**
 * course.json の thumbnail 省略時に探すファイル名（この順に採用する）。
 *
 * scripts/check_thumbnails.mjs の CANDIDATES と同じ並びに保つこと。検査だけが知っている
 * 拡張子があると、CI は通るのに manifest が拾わず、無言でストライプ表示のままになる。
 */
const THUMBNAIL_CANDIDATES = [
  "thumbnail.webp",
  "thumbnail.png",
  "thumbnail.jpg",
  "thumbnail.jpeg",
] as const;

const THUMBNAIL_CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** 講座サムネイル 1 件。R2 のキーが D1 `courses.thumbnail_path` にそのまま入る。 */
export interface CourseThumbnail {
  slug: string;
  tenantId: string;
  /** リポジトリ内の実ファイル（絶対パス） */
  sourceFile: string;
  /** R2 キー。内容ハッシュ入りなので、差し替えると URL ごと変わりキャッシュを跨がない。 */
  key: string;
  contentType: string;
}

/**
 * 講座ディレクトリ直下のサムネイルを解決する。
 *
 * キーに内容ハッシュを混ぜるのは、公開 R2 の URL が固定だと差し替えが CDN /
 * ブラウザキャッシュに阻まれて反映されないため。古いキーのオブジェクトは
 * `bun run r2:orphans` の棚卸しに出る（参照は最新の 1 件だけ）。
 *
 * テナントは assetPath() と同じ TENANT_ID を使う。seed (export-seed-sql.ts) が
 * 教材コースを `emitCourse("ses", ...)` で固定して入れるので、キーだけ course.json の
 * tenantId に従うと「ses のコース行が別テナントのプレフィクスを指す」状態になり、
 * その別テナントの r2:orphans が配信中のサムネイルを孤児として消せてしまう。
 */
function resolveThumbnail(
  courseDir: string,
  slug: string,
  config: CourseConfig & { tenantId: string },
): CourseThumbnail | undefined {
  const explicit = config.thumbnail?.trim();
  if (explicit && (explicit.includes("..") || explicit.startsWith("/"))) {
    throw new Error(
      `courses/${slug}/course.json の thumbnail は講座ディレクトリ内の相対パスにしてください: ${explicit}`,
    );
  }
  const candidates = explicit ? [explicit] : [...THUMBNAIL_CANDIDATES];
  for (const rel of candidates) {
    const file = join(courseDir, rel);
    if (!existsSync(file)) continue;
    const ext = extname(file).toLowerCase();
    const contentType = THUMBNAIL_CONTENT_TYPES[ext];
    if (!contentType) {
      throw new Error(
        `courses/${slug} のサムネイルは ${Object.keys(THUMBNAIL_CONTENT_TYPES).join(" / ")} のみ対応しています: ${rel}`,
      );
    }
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
    return {
      slug,
      tenantId: TENANT_ID,
      sourceFile: file,
      key: `tenant/${TENANT_ID}/courses/${slug}/thumbnail-${hash}${ext}`,
      contentType,
    };
  }
  if (explicit) {
    throw new Error(
      `courses/${slug}/course.json の thumbnail が指すファイルがありません: ${explicit}`,
    );
  }
  return undefined;
}

/**
 * スキルツリーの星に出す講座アイコン (`courses/<slug>/icon.svg`)。
 *
 * 単色シルエットの SVG で、色は持たず画面側が CSS mask + currentColor で塗る
 * (ダーク / ライトどちらのテーマでも星の文字色に追従する)。キーはサムネイルと
 * 同じく内容ハッシュ入りで、D1 `stages.icon_path` と R2 のキー計算を一致させる。
 */
function resolveIcon(courseDir: string, slug: string): CourseThumbnail | undefined {
  const file = join(courseDir, "icon.svg");
  if (!existsSync(file)) return undefined;
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
  return {
    slug,
    tenantId: TENANT_ID,
    sourceFile: file,
    key: `tenant/${TENANT_ID}/courses/${slug}/icon-${hash}.svg`,
    contentType: "image/svg+xml",
  };
}

/**
 * 直下のディレクトリを自然順で返す。並び = セクション / レッスン / トピックの順序なので、
 * 辞書順にすると `m10-mock-exam` が `m1` と `m2` の間に割り込む。
 */
function dirsIn(path: string): string[] {
  return sortNatural(readdirSync(path).filter((e) => statSync(join(path, e)).isDirectory()));
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
  if (raw.prerequisites != null) {
    if (!Array.isArray(raw.prerequisites) || raw.prerequisites.some((p) => typeof p !== "string")) {
      throw new Error(
        `courses/${slug}/course.json の prerequisites は slug の配列にしてください。`,
      );
    }
    const trimmed = raw.prerequisites.map((p) => p.trim());
    if (trimmed.some((p) => p === "")) {
      throw new Error(`courses/${slug}/course.json の prerequisites に空の slug があります。`);
    }
    if (trimmed.includes(slug)) {
      throw new Error(`courses/${slug}/course.json の prerequisites が自分自身を指しています。`);
    }
    if (new Set(trimmed).size !== trimmed.length) {
      throw new Error(`courses/${slug}/course.json の prerequisites に重複があります。`);
    }
  }
  if (raw.appearances != null) {
    if (!Array.isArray(raw.appearances) || raw.appearances.some((s) => typeof s !== "string")) {
      throw new Error(
        `courses/${slug}/course.json の appearances は扇名 (文字列) の配列にしてください。`,
      );
    }
    const trimmed = raw.appearances.map((s) => s.trim());
    if (trimmed.some((s) => s === "")) {
      throw new Error(`courses/${slug}/course.json の appearances に空の扇名があります。`);
    }
    if (new Set(trimmed).size !== trimmed.length) {
      throw new Error(`courses/${slug}/course.json の appearances に重複があります。`);
    }
    if (trimmed.length < 2) {
      throw new Error(
        `courses/${slug}/course.json の appearances は 2 つ以上の扇にしてください (1 つなら category で足ります)。`,
      );
    }
    // 扇ごとの親が無いと、複製は線の元も鍵も持てない (実行時は複製そのものを作らない)。
    if (raw.appearancePrerequisites == null) {
      throw new Error(
        `courses/${slug}/course.json の appearances には appearancePrerequisites が必要です (全扇ぶんの親を書きます)。`,
      );
    }
  }
  if (raw.appearancePrerequisites != null) {
    const sectors = (raw.appearances ?? []).map((s) => s.trim());
    if (sectors.length === 0) {
      throw new Error(
        `courses/${slug}/course.json の appearancePrerequisites には appearances が必要です。`,
      );
    }
    const groups = raw.appearancePrerequisites;
    if (typeof groups !== "object" || Array.isArray(groups)) {
      throw new Error(
        `courses/${slug}/course.json の appearancePrerequisites は扇名 → slug 配列にしてください。`,
      );
    }
    const keys = Object.keys(groups);
    if ([...keys].sort().join("\0") !== [...sectors].sort().join("\0")) {
      throw new Error(
        `courses/${slug}/course.json の appearancePrerequisites のキーは appearances と同じ扇にしてください。`,
      );
    }
    const union: string[] = [];
    for (const sector of sectors) {
      const slugs = groups[sector];
      if (!Array.isArray(slugs) || slugs.some((p) => typeof p !== "string")) {
        throw new Error(
          `courses/${slug}/course.json の appearancePrerequisites.${sector} は slug の配列にしてください。`,
        );
      }
      const trimmedSlugs = slugs.map((p) => p.trim());
      if (trimmedSlugs.some((p) => p === "")) {
        throw new Error(
          `courses/${slug}/course.json の appearancePrerequisites.${sector} に空の slug があります。`,
        );
      }
      if (trimmedSlugs.includes(slug)) {
        throw new Error(
          `courses/${slug}/course.json の appearancePrerequisites.${sector} が自分自身を指しています。`,
        );
      }
      if (new Set(trimmedSlugs).size !== trimmedSlugs.length) {
        throw new Error(
          `courses/${slug}/course.json の appearancePrerequisites.${sector} に重複があります。`,
        );
      }
      if (trimmedSlugs.length !== 1) {
        throw new Error(
          `courses/${slug}/course.json の appearancePrerequisites.${sector} は slug をちょうど 1 つにしてください (その扇の親 = 線の元)。`,
        );
      }
      for (const prereq of trimmedSlugs) {
        if (!union.includes(prereq)) union.push(prereq);
      }
    }
    const listed = (raw.prerequisites ?? []).map((p) => p.trim());
    if (listed.join("\0") !== union.join("\0")) {
      throw new Error(
        `courses/${slug}/course.json の prerequisites は appearancePrerequisites の和集合にしてください。`,
      );
    }
  }
  {
    const listed = (raw.prerequisites ?? []).map((p) => p.trim());
    if (raw.parent != null) {
      if (typeof raw.parent !== "string" || raw.parent.trim() === "") {
        throw new Error(`courses/${slug}/course.json の parent は slug (文字列) にしてください。`);
      }
      if (raw.appearances != null) {
        throw new Error(
          `courses/${slug}/course.json の parent は appearances と併用できません (扇ごとの親は appearancePrerequisites に書きます)。`,
        );
      }
      if (!listed.includes(raw.parent.trim())) {
        throw new Error(
          `courses/${slug}/course.json の parent は prerequisites に含めてください: ${raw.parent}`,
        );
      }
    } else if (listed.length >= 2 && raw.appearances == null) {
      throw new Error(
        `courses/${slug}/course.json の prerequisites が 2 つ以上なので、線を引く 1 つを parent に指定してください。`,
      );
    }
  }
  for (const field of ["canDo", "theme"] as const) {
    const value = raw[field];
    if (value != null && (typeof value !== "string" || value.trim() === "")) {
      throw new Error(`courses/${slug}/course.json の ${field} は空でない文字列にしてください。`);
    }
  }
  const audience = raw.audience ?? "catalog";
  if (audience !== "catalog" && audience !== "granted") {
    throw new Error(
      `courses/${slug}/course.json の audience は "catalog" または "granted" にしてください: ${String(raw.audience)}`,
    );
  }
  if (audience === "granted") {
    const listed = (raw.prerequisites ?? []).map((p) => p.trim());
    if (listed.length === 0) {
      throw new Error(
        `courses/${slug}/course.json の audience が granted のときは catalog の親 (prerequisites) を 1 つ以上書いてください。`,
      );
    }
    if (raw.appearances != null) {
      throw new Error(
        `courses/${slug}/course.json の audience が granted のときは appearances を書けません。`,
      );
    }
  }
  const tenantId = raw.tenantId?.trim() || TENANT_ID;
  // seed は教材コースを TENANT_ID 固定で入れる。ここだけ別テナントを名乗れると、
  // コース行と R2 キーのテナントがずれる (どちらも黙って壊れる) ので先に落とす。
  if (tenantId !== TENANT_ID) {
    throw new Error(
      `courses/${slug}/course.json の tenantId は "${TENANT_ID}" のみ対応しています: ${tenantId}`,
    );
  }
  return { ...raw, tenantId };
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

/**
 * 確認クイズの所要時間表示。
 *
 * レッスン末尾の確認クイズは 3〜5 問なので既定は「5分」。ただし模擬試験
 * (aws-clf-c02-basics の M10 は 65 問) のような桁違いに長いクイズまで 5 分と
 * 出すと、受講者と講師の時間見積もりが大きく狂う。10 問を超えるものだけ
 * 1 問 80 秒で概算し、5 分単位に切り上げる。
 */
function quizDuration(questionCount: number): string {
  if (questionCount <= 10) return "5分";
  return `${Math.ceil((questionCount * 80) / 60 / 5) * 5}分`;
}

/** レッスンディレクトリ ID (`l1-variables`) と id (`1-1`) から doc/quiz の安定キーを作る。 */
function lessonKey(topicIds: string[]): string {
  // トピック id は "1-1-2" 形式。先頭 2 節がレッスンを表す。
  const first = topicIds[0] ?? "";
  return first.split("-").slice(0, 2).join("-");
}

function buildOneCourse(
  slug: string,
  courseDir: string,
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
      const practiceSource = readFileSync(practiceFile, "utf8").replace(/\r\n/g, "\n");
      const questions = parseQuiz(practiceSource);
      if (questions.length > 0) {
        const quizLessonId = `quiz-${key}`;
        lessons.push({
          id: quizLessonId,
          title: `${key} 確認クイズ`,
          type: "quiz",
          duration: quizDuration(questions.length),
          status: "todo",
        });
        quizzes.push({
          courseId: slug,
          lessonId: quizLessonId,
          passScore: 80,
          questions,
          sourceText: practiceSource,
        });
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
  const thumbnail = resolveThumbnail(courseDir, slug, config);
  const icon = resolveIcon(courseDir, slug);
  // 線を引く親。省略時は前提が 1 つならそれ (下流が「無い」を解釈しなくて済む)。
  // ただし appearances 持ちは補完しない — 扇ごとの親は appearancePrerequisites が持つので、
  // 全扇が同じ前提を指して和集合が 1 件になっても、この講座に parent は付かない。
  const prerequisiteSlugs = (config.prerequisites ?? []).map((p) => p.trim());
  const hasAppearances = (config.appearances?.length ?? 0) > 0;
  const parent =
    config.parent?.trim() ??
    (prerequisiteSlugs.length === 1 && !hasAppearances ? prerequisiteSlugs[0] : undefined);

  return {
    course: {
      id: slug,
      title: config.title,
      category: config.category ?? "",
      color: config.color ?? "indigo",
      lessonsCount,
      progress: 0,
      description: config.description,
      ...(thumbnail ? { thumbnailPath: thumbnail.key } : {}),
      ...(icon ? { iconPath: icon.key } : {}),
      // 空配列は「前提なし」と同義なので落とす (seed の JSON 列を null に保つ)。
      ...(config.prerequisites && config.prerequisites.length > 0
        ? { prerequisites: config.prerequisites.map((p) => p.trim()) }
        : {}),
      ...(parent ? { parent } : {}),
      ...(config.canDo ? { canDo: config.canDo.trim() } : {}),
      ...(config.theme ? { theme: config.theme.trim() } : {}),
      ...(config.audience === "granted" ? { audience: "granted" as const } : {}),
      ...(config.appearances && config.appearances.length > 0
        ? { appearances: config.appearances.map((s) => s.trim()) }
        : {}),
      sections,
    },
    quizzes,
  };
}

/**
 * 前提講座 (`prerequisites`) のグラフを検査する。
 *
 * 前提はスキルツリーの **ハードロック** なので、綴り違いや循環をそのまま D1 へ流すと
 * 「誰も開けない講座」が黙って生まれる。実行時 (評価器) は安全側に倒して locked のまま
 * にするだけなので、気付ける場所はここしかない。
 */
function assertPrerequisiteGraph(courses: Course[]): void {
  const bySlug = new Map(courses.map((c) => [c.id, c]));
  for (const course of courses) {
    for (const prereq of course.prerequisites ?? []) {
      if (!bySlug.has(prereq)) {
        throw new Error(
          `courses/${course.id}/course.json の prerequisites に存在しない講座があります: ${prereq}`,
        );
      }
    }
  }

  // 深さ優先で後退辺 (= 循環) を探す。講座数は 2 桁なので素朴な再帰で足りる。
  const visiting = new Set<string>();
  const done = new Set<string>();
  const path: string[] = [];
  const walk = (slug: string): void => {
    if (done.has(slug)) return;
    if (visiting.has(slug)) {
      const cycle = [...path.slice(path.indexOf(slug)), slug];
      throw new Error(`course.json の prerequisites が循環しています: ${cycle.join(" → ")}`);
    }
    visiting.add(slug);
    path.push(slug);
    for (const prereq of bySlug.get(slug)?.prerequisites ?? []) walk(prereq);
    path.pop();
    visiting.delete(slug);
    done.add(slug);
  };
  for (const course of courses) walk(course.id);
}

/**
 * `audience: granted` のグラフ制約。 catalog が granted を前提にすると他受講者が
 * 永久ロックされる / ロック理由から名前が漏れるため、ビルドで落とす。
 */
function assertGrantedAudienceGraph(courses: Course[]): void {
  const bySlug = new Map(courses.map((c) => [c.id, c]));
  const grantedSlugs = new Set(courses.filter((c) => c.audience === "granted").map((c) => c.id));
  if (grantedSlugs.size === 0) return;

  for (const course of courses) {
    if (course.audience !== "granted") {
      for (const prereq of course.prerequisites ?? []) {
        if (grantedSlugs.has(prereq)) {
          throw new Error(
            `courses/${course.id}/course.json の prerequisites に granted 講座を書けません: ${prereq}`,
          );
        }
      }
      if (course.parent != null && grantedSlugs.has(course.parent)) {
        throw new Error(
          `courses/${course.id}/course.json の parent に granted 講座を書けません: ${course.parent}`,
        );
      }
      continue;
    }

    for (const prereq of course.prerequisites ?? []) {
      const parent = bySlug.get(prereq);
      if (parent?.audience === "granted") {
        throw new Error(
          `courses/${course.id}/course.json の granted 講座は catalog の親だけを prerequisites に書けます: ${prereq}`,
        );
      }
    }
  }
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
    const built = buildOneCourse(slug, courseDir, modulesRoot, readCourseConfig(courseDir, slug));
    courses.push(built.course);
    quizzes.push(...built.quizzes);
  }

  assertPrerequisiteGraph(courses);
  assertGrantedAudienceGraph(courses);

  return { courses, quizzes };
}

/**
 * 全講座のサムネイルを列挙する。R2 へ流す `upload-materials.ts` が使う。
 *
 * キーは buildContentManifest() が D1 に入れる `courses.thumbnail_path` と同じ
 * 計算なので、seed とアップロードが同じコミットから走る限り必ず一致する。
 */
export function collectCourseThumbnails(
  coursesRoot: string = defaultCoursesRoot(),
): CourseThumbnail[] {
  const thumbnails: CourseThumbnail[] = [];
  for (const slug of dirsIn(coursesRoot)) {
    const courseDir = join(coursesRoot, slug);
    if (!existsSync(join(courseDir, "modules"))) continue;
    const thumbnail = resolveThumbnail(courseDir, slug, readCourseConfig(courseDir, slug));
    if (thumbnail) thumbnails.push(thumbnail);
  }
  return thumbnails;
}

/**
 * 全講座のスキルツリーアイコンを列挙する。R2 へ流す `upload-materials.ts` が使う。
 *
 * キーは buildContentManifest() が D1 に入れる `stages.icon_path` と同じ計算なので、
 * seed とアップロードが同じコミットから走る限り必ず一致する。
 */
export function collectCourseIcons(coursesRoot: string = defaultCoursesRoot()): CourseThumbnail[] {
  const icons: CourseThumbnail[] = [];
  for (const slug of dirsIn(coursesRoot)) {
    const courseDir = join(coursesRoot, slug);
    if (!existsSync(join(courseDir, "modules"))) continue;
    const icon = resolveIcon(courseDir, slug);
    if (icon) icons.push(icon);
  }
  return icons;
}
