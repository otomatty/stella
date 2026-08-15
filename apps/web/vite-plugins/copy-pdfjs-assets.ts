/**
 * pdfjs-dist の `cmaps/` と `standard_fonts/` を `public/pdfjs/` に同期する Vite プラグイン。
 *
 * - 日本語 PDF を react-pdf で開く際に CMap が必要 (CJK フォント解決)
 * - 標準 PDF フォントが埋め込まれていない PDF のために standard_fonts も配置
 * - 開発 / 本番両方で `/pdfjs/cmaps/` 配信される
 * - `<Document options={{ cMapUrl: '/pdfjs/cmaps/', ... }}>` から参照
 *
 * 既存の `copy-sqljs-wasm.ts` と同パターン。
 */

import { createRequire } from "node:module";
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

function copyDir(src: string, dst: string): number {
  mkdirSync(dst, { recursive: true });
  let count = 0;
  for (const name of readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    const stat = statSync(s);
    if (stat.isDirectory()) {
      count += copyDir(s, d);
    } else {
      if (existsSync(d)) {
        const dstStat = statSync(d);
        if (dstStat.size === stat.size && dstStat.mtimeMs >= stat.mtimeMs) continue;
      }
      copyFileSync(s, d);
      count += 1;
    }
  }
  return count;
}

export function copyPdfjsAssets(): Plugin {
  return {
    name: "copy-pdfjs-assets",
    configResolved(config) {
      const isBuild = config.command === "build";
      try {
        // pdfjs-dist の package.json から install dir を解決
        const pkgJson = require.resolve("pdfjs-dist/package.json");
        const pdfjsRoot = path.dirname(pkgJson);
        const targets = [
          { src: path.join(pdfjsRoot, "cmaps"), name: "cmaps" },
          { src: path.join(pdfjsRoot, "standard_fonts"), name: "standard_fonts" },
        ];
        const baseTarget = path.join(config.publicDir, "pdfjs");
        for (const t of targets) {
          if (!existsSync(t.src)) {
            const msg = `[copy-pdfjs-assets] ${t.src} not found; Japanese PDFs may fail to render`;
            if (isBuild) throw new Error(msg);
            config.logger.warn(msg);
            continue;
          }
          const dst = path.join(baseTarget, t.name);
          const copied = copyDir(t.src, dst);
          if (copied > 0) {
            config.logger.info(
              `[copy-pdfjs-assets] synced ${t.name} (${copied} files) to ${path.relative(config.root, dst)}`,
            );
          }
        }
      } catch (e) {
        if (isBuild) throw e instanceof Error ? e : new Error(String(e));
        const msg = e instanceof Error ? e.message : String(e);
        config.logger.warn(`[copy-pdfjs-assets] failed: ${msg}`);
      }
    },
  };
}
