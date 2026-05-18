/**
 * `sql.js` の `sql-wasm.wasm` を `public/sqljs/` に同期する Vite プラグイン (#109)。
 *
 * - dev/build 開始前に、 node_modules の wasm を `public/sqljs/sql-wasm.wasm` へコピー
 * - 既に同サイズ + 同 mtime で存在する場合はスキップ (余計な書き込みを避ける)
 * - Vite の publicDir 機構で `/sqljs/sql-wasm.wasm` として配信される
 * - sql.js 初期化時の `locateFile: f => "/sqljs/" + f` で参照する
 */

import { createRequire } from "node:module";
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

export function copySqlJsWasm(): Plugin {
  return {
    name: "copy-sqljs-wasm",
    configResolved(config) {
      // build 時に wasm 配置に失敗すると、 サイレントに壊れた本番が出てしまうため、
      // build コマンドではエラー扱いにする (coderabbit major 対応)。
      const isBuild = config.command === "build";
      try {
        const sqlJsEntry = require.resolve("sql.js");
        const distDir = path.dirname(sqlJsEntry);
        const source = path.join(distDir, "sql-wasm.wasm");
        if (!existsSync(source)) {
          const msg = `[copy-sqljs-wasm] sql-wasm.wasm not found at ${source}; SQL runner will fail at runtime`;
          if (isBuild) {
            throw new Error(msg);
          }
          config.logger.warn(msg);
          return;
        }
        const targetDir = path.join(config.publicDir, "sqljs");
        const target = path.join(targetDir, "sql-wasm.wasm");
        if (existsSync(target)) {
          const srcStat = statSync(source);
          const dstStat = statSync(target);
          if (
            dstStat.size === srcStat.size &&
            dstStat.mtimeMs >= srcStat.mtimeMs
          ) {
            return; // already in place (size + mtime match)
          }
        }
        mkdirSync(targetDir, { recursive: true });
        copyFileSync(source, target);
        config.logger.info(
          `[copy-sqljs-wasm] copied sql-wasm.wasm to ${path.relative(config.root, target)}`,
        );
      } catch (e) {
        if (isBuild) {
          throw e instanceof Error ? e : new Error(String(e));
        }
        const msg = e instanceof Error ? e.message : String(e);
        config.logger.warn(`[copy-sqljs-wasm] failed: ${msg}`);
      }
    },
  };
}
