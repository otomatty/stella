/**
 * 教材 PDF 自動生成の共有ロジック。
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

import type { Stage } from "../../../apps/web/src/data/types.js";
import {
  hasOsBlocks,
  OS_LABELS,
  OS_NAMES,
  type OsName,
  selectOsMarkdown,
} from "../../shared/src/markdown/os-blocks.js";
import { assetPath, buildContentManifest, TENANT_ID } from "./manifest.js";
import type { QuizSeed } from "./types.js";

/**
 * 見た目 (スキン CSS・レイアウト・変換ロジック) を変えたら上げる。ハッシュに混ぜて
 * いるので、上げると全教材が「変更あり」になり次のデプロイで全版が作り直される。
 */
export const PDF_GENERATOR_VERSION = 1;

export type PdfKind = "slides" | "doc" | "practice" | "task";

export interface PdfAsset {
  /** R2 のオブジェクトキー (markdown 中の参照と同じ)。 */
  key: string;
  /** リポジトリ内の実ファイル (絶対パス)。 */
  file: string;
}

export interface PdfTarget {
  tenantId: string;
  stageSlug: string;
  /** ステージタイトル。スライドのヘッダー (アプリの MarkdownSlides と同じ) に使う。 */
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
  /**
   * OS 別に分けた PDF (stage.json の `pdfByOs`) が載せる OS。本文の OS 別のブロックは
   * この OS のものだけを使う。未設定なら OS 別のブロックを両方とも見出し付きで並べる (07 §11)。
   */
  os?: OsName;
}

const here = dirname(fileURLToPath(import.meta.url));
const stagesRoot = join(here, "..", "stages");

/** コース内の全 assets ファイルを R2 キー → 実ファイルの表にする。 */
function collectAssetMap(stageSlug: string): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory() || ["private", "tasks"].includes(entry)) continue;
      if (entry === "assets") {
        const topicDir = basename(dir);
        for (const file of readdirSync(full)) {
          if (!statSync(join(full, file)).isFile()) continue;
          map.set(assetPath(stageSlug, topicDir, file), join(full, file));
        }
      } else {
        walk(full);
      }
    }
  };
  const modulesRoot = join(stagesRoot, stageSlug, "modules");
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
  manifest: { stages: Stage[]; quizzes: QuizSeed[]; pdfByOs?: string[] } = buildContentManifest(),
): PdfTarget[] {
  const targets: PdfTarget[] = [];
  for (const stage of manifest.stages) {
    const assetMap = collectAssetMap(stage.id);
    const resolveAssets = (source: string, lessonId: string): PdfAsset[] =>
      referencedAssetKeys(source).map((key) => {
        const file = assetMap.get(key);
        if (!file) {
          throw new Error(`asset not found: ${key} (stage ${stage.id}, lesson ${lessonId})`);
        }
        return { key, file };
      });
    for (const section of stage.sections ?? []) {
      for (const lesson of section.lessons) {
        if (stage.format === 2 && lesson.type !== "text") continue;
        let kind: PdfKind;
        let source: string;
        if (lesson.type === "slides" && lesson.markdown) {
          kind = "slides";
          source = lesson.markdown;
        } else if (lesson.type === "text" && lesson.markdown) {
          kind = stage.format === 2 && lesson.id.startsWith("task-") ? "task" : "doc";
          source = lesson.markdown;
        } else if (lesson.type === "quiz") {
          const quiz = manifest.quizzes.find(
            (q) => q.stageId === stage.id && q.lessonId === lesson.id,
          );
          if (!quiz) continue;
          kind = "practice";
          source = quiz.sourceText;
        } else {
          continue;
        }
        const base = {
          tenantId: TENANT_ID,
          stageSlug: stage.id,
          courseTitle: stage.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          kind,
          source,
        };
        // OS 別の手順はまとめと課題文にだけ書ける。OS の差が大きいステージは OS ごとに作る。
        if (
          (kind === "doc" || kind === "task") &&
          manifest.pdfByOs?.includes(stage.id) &&
          hasOsBlocks(source)
        ) {
          for (const os of OS_NAMES)
            targets.push({
              ...base,
              os,
              assets: resolveAssets(selectOsMarkdown(source, os), lesson.id),
            });
          continue;
        }
        targets.push({ ...base, assets: resolveAssets(source, lesson.id) });
      }
    }
  }
  return targets;
}

/**
 * 生成元の内容ハッシュ。本文・ステージタイトル (紙面のヘッダーに載る)・参照画像・
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
  target: Pick<PdfTarget, "kind" | "source" | "assets" | "courseTitle" | "os">,
): string {
  const salt = process.env.PDF_KEY_SALT ?? "";
  const hash = salt === "" ? createHash("sha256") : createHmac("sha256", salt);
  hash.update(
    JSON.stringify({
      v: PDF_GENERATOR_VERSION,
      kind: target.kind,
      courseTitle: target.courseTitle,
      // OS を分けない PDF のハッシュ (= 既存の R2 キー) は変えない。
      ...(target.os ? { os: target.os } : {}),
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
  target: Pick<PdfTarget, "tenantId" | "stageSlug" | "lessonId">,
  hash: string,
): string {
  return `lesson-pdf/${target.tenantId}/${target.stageSlug}/${target.lessonId}/${hash}.pdf`;
}

/** 受講者に見えるダウンロードファイル名。OS 別の PDF は「1-1 まとめ (Windows).pdf」。 */
export function pdfFileName(
  target: Pick<PdfTarget, "kind" | "lessonId" | "lessonTitle" | "os">,
): string {
  // doc / quiz のタイトルは「1-1 まとめ」のように番号入り。slides はタイトルに
  // 番号が無いので lessonId (`1-1-2`) を前置して並び順を保つ。
  const title =
    target.kind === "slides" ? `${target.lessonId} ${target.lessonTitle}` : target.lessonTitle;
  const base = target.os ? `${title} (${OS_LABELS[target.os]})` : title;
  return `${base
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()}.pdf`;
}
