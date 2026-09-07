/**
 * 教材 PDF 自動生成の共有ロジック (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 *
 * - 生成対象 (トピック単位 = D1 レッスン単位) の列挙
 * - 生成元の内容ハッシュ (= R2 キーの一部。差分検知と版判定の正本)
 * - R2 キーと配布ファイル名
 *
 * ジェネレータ (scripts/build-pdf.ts) と seed (export-seed-sql.ts) の両方が使うので、
 * ここは Node 標準 + manifest だけに依存させる (playwright は持ち込まない)。
 */

import { createHash, createHmac } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Course } from "../../../apps/web/src/data/types.js";
import { assetPath, buildContentManifest, TENANT_ID } from "./manifest.js";
import type { QuizSeed } from "./types.js";

/**
 * 見た目 (スキン CSS・レイアウト・変換ロジック) を変えたら上げる。ハッシュに混ぜて
 * いるので、上げると全教材が「変更あり」になり次のデプロイで全版が作り直される。
 */
export const PDF_GENERATOR_VERSION = 1;

export type PdfKind = "slides" | "doc" | "practice";

export interface PdfAsset {
  /** R2 のオブジェクトキー (markdown 中の参照と同じ)。 */
  key: string;
  /** リポジトリ内の実ファイル (絶対パス)。 */
  file: string;
}

export interface PdfTarget {
  tenantId: string;
  courseSlug: string;
  /** 講座タイトル。スライドのヘッダー (アプリの MarkdownSlides と同じ) に使う。 */
  courseTitle: string;
  /** manifest が振るレッスンの安定キー (例: `1-1-2` / `doc-1-1` / `quiz-1-1`)。 */
  lessonId: string;
  lessonTitle: string;
  kind: PdfKind;
  /**
   * 生成元テキスト。slides / doc は D1 lessons.markdown と同じ文字列、
   * practice は practice.md 全文 (QuizSeed.sourceText)。
   * lesson_revisions のスナップショットとも一致する。
   */
  source: string;
  /** 本文から参照される画像。ハッシュと描画の両方に使う。 */
  assets: PdfAsset[];
}

const here = dirname(fileURLToPath(import.meta.url));
const coursesRoot = join(here, "..", "courses");

/** コース内の全 assets ファイルを R2 キー → 実ファイルの表にする。 */
function collectAssetMap(courseSlug: string): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry === "assets") {
        const topicDir = basename(dir);
        for (const file of readdirSync(full)) {
          if (!statSync(join(full, file)).isFile()) continue;
          map.set(assetPath(courseSlug, topicDir, file), join(full, file));
        }
      } else {
        walk(full);
      }
    }
  };
  const modulesRoot = join(coursesRoot, courseSlug, "modules");
  walk(modulesRoot);
  return map;
}

/** 本文が参照する画像キー (rewriteImagePaths 済みの `tenant/...` 形式) を拾う。 */
function referencedAssetKeys(source: string): string[] {
  const keys = new Set<string>();
  for (const m of source.matchAll(/!\[[^\]]*\]\((tenant\/[^\s)]+)\)/g)) {
    keys.add(m[1]);
  }
  return [...keys];
}

/**
 * 生成対象を列挙する。manifest (= D1 に入るのと同じ本文) が正本。
 * 参照先の画像ファイルが無ければ throw する — 壊れた参照のまま PDF を作らない。
 */
export function collectPdfTargets(
  manifest: { courses: Course[]; quizzes: QuizSeed[] } = buildContentManifest(),
): PdfTarget[] {
  const targets: PdfTarget[] = [];
  for (const course of manifest.courses) {
    const assetMap = collectAssetMap(course.id);
    const resolveAssets = (source: string, lessonId: string): PdfAsset[] =>
      referencedAssetKeys(source).map((key) => {
        const file = assetMap.get(key);
        if (!file) {
          throw new Error(`asset not found: ${key} (course ${course.id}, lesson ${lessonId})`);
        }
        return { key, file };
      });
    for (const section of course.sections ?? []) {
      for (const lesson of section.lessons) {
        let kind: PdfKind;
        let source: string;
        if (lesson.type === "slides" && lesson.markdown) {
          kind = "slides";
          source = lesson.markdown;
        } else if (lesson.type === "text" && lesson.markdown) {
          kind = "doc";
          source = lesson.markdown;
        } else if (lesson.type === "quiz") {
          const quiz = manifest.quizzes.find(
            (q) => q.courseId === course.id && q.lessonId === lesson.id,
          );
          if (!quiz) continue;
          kind = "practice";
          source = quiz.sourceText;
        } else {
          continue;
        }
        targets.push({
          tenantId: TENANT_ID,
          courseSlug: course.id,
          courseTitle: course.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          kind,
          source,
          assets: resolveAssets(source, lesson.id),
        });
      }
    }
  }
  return targets;
}

/**
 * 生成元の内容ハッシュ。本文・講座タイトル (紙面のヘッダーに載る)・参照画像・
 * ジェネレータ版のどれかが変わると変わる。R2 キーに入り、
 * lesson_material_versions.source_hash にもそのまま入る。
 *
 * バケット (stella-materials-public) は公開 URL を持つため、キーが計算可能だと
 * 認可プロキシを迂回して直リンクで取れてしまう (PR #256 レビュー指摘)。環境変数
 * `PDF_KEY_SALT` (deploy の Secrets) が設定されていれば HMAC にしてキーを
 * 推測不能にする。未設定でも動くが、その場合キーはリポジトリ内容を持つ者には
 * 計算できる (手動アップロード資料の「公開バケット + 推測不能パス + プロキシ配信」
 * と同じ緩和クラス)。ソルトを変えると全キーが変わり全教材が新版になる。
 */
export function pdfSourceHash(
  target: Pick<PdfTarget, "kind" | "source" | "assets" | "courseTitle">,
): string {
  const salt = process.env.PDF_KEY_SALT ?? "";
  const hash = salt === "" ? createHash("sha256") : createHmac("sha256", salt);
  hash.update(
    JSON.stringify({
      v: PDF_GENERATOR_VERSION,
      kind: target.kind,
      courseTitle: target.courseTitle,
    }),
  );
  hash.update(target.source);
  for (const asset of [...target.assets].sort((a, b) => a.key.localeCompare(b.key))) {
    hash.update(asset.key);
    hash.update(readFileSync(asset.file));
  }
  return hash.digest("hex");
}

/**
 * R2 のオブジェクトキー。ハッシュ入りで不変 — 版を上書きしない (旧版は全部残す)。
 */
export function pdfObjectKey(
  target: Pick<PdfTarget, "tenantId" | "courseSlug" | "lessonId">,
  hash: string,
): string {
  return `lesson-pdf/${target.tenantId}/${target.courseSlug}/${target.lessonId}/${hash}.pdf`;
}

/** 受講者に見えるダウンロードファイル名。 */
export function pdfFileName(target: Pick<PdfTarget, "kind" | "lessonId" | "lessonTitle">): string {
  // doc / quiz のタイトルは「1-1 まとめ」のように番号入り。slides はタイトルに
  // 番号が無いので lessonId (`1-1-2`) を前置して並び順を保つ。
  const base =
    target.kind === "slides" ? `${target.lessonId} ${target.lessonTitle}` : target.lessonTitle;
  return `${base
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()}.pdf`;
}
