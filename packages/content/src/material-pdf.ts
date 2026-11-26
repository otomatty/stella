/** 教材動画が使うスライドの本文と画像を、seed と同じ manifest から集める。 */
import { readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assetPath, buildContentManifest } from "./manifest.js";

interface PdfAsset {
  /** R2 のオブジェクトキー (markdown 中の参照と同じ)。 */
  key: string;
  /** リポジトリ内の実ファイル (絶対パス)。 */
  file: string;
}

interface PdfTarget {
  stageSlug: string;
  courseTitle: string;
  lessonId: string;
  source: string;
  assets: PdfAsset[];
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

/** 参照先の画像ファイルが無ければ、動画の生成前に停止する。 */
export function collectPdfTargets(): PdfTarget[] {
  const targets: PdfTarget[] = [];
  for (const stage of buildContentManifest().stages) {
    const assetMap = collectAssetMap(stage.id);
    for (const section of stage.sections ?? []) {
      for (const lesson of section.lessons) {
        if (lesson.type !== "slides" || !lesson.markdown) continue;
        const assets = referencedAssetKeys(lesson.markdown).map((key) => {
          const file = assetMap.get(key);
          if (!file) {
            throw new Error(`asset not found: ${key} (stage ${stage.id}, lesson ${lesson.id})`);
          }
          return { key, file };
        });
        targets.push({
          stageSlug: stage.id,
          courseTitle: stage.title,
          lessonId: lesson.id,
          source: lesson.markdown,
          assets,
        });
      }
    }
  }
  return targets;
}
