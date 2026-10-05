/**
 * Web の配信物に課題の解答を混ぜない (#35)。遅延 import や raw import も拒否し、
 * 最後に publicDir・worker・source map を含む書き出し済みの成果物を検査する。
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const PRIVATE_MODULE =
  /(?:^|\/)packages\/shared\/src\/(?:assignments\.ts$|problems(?:\/|$))|(?:^|\/)packages\/content\/(?:.*\/)?private(?:\/|$)/;
const PRIVATE_PATH = /(?:^|[/\\])private[/\\]/;
// JS の正規表現 /private\(set\)/ をパスと誤認しない。Windows のパスは
// JS / JSON 内ではバックスラッシュが 2 個にエスケープされる。
// 引用符・バッククォート直後の相対パスも検出する。
const PRIVATE_REFERENCE = /(?:^|[/\\"'`])private(?:\/|\\\\)/;
const ANSWER_PROPERTY = /(?:\b(?:solution|badSolutions)|["'](?:solution|badSolutions)["'])\s*:/;

/** バイナリを含む全ファイルの ASCII マーカーを検査し、解答や private/ があれば拒否する。 */
function assertSafeFileContents(file: string): void {
  // Latin-1 は各バイトをそのまま文字へ写す。拡張子や UTF-8 としての妥当性に依存しない。
  const contents = readFileSync(file, "latin1");
  if (ANSWER_PROPERTY.test(contents) || PRIVATE_REFERENCE.test(contents)) {
    throw new Error(`[no-private-content] answer or private/ content: ${file}`);
  }
}

/** CLI を通らない Vite build でも検査するため、build plugin から呼ぶ。 */
export function assertSafeWebBuild(outDir: string): void {
  function inspect(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const relative = path.relative(outDir, file);
      if (PRIVATE_PATH.test(relative.replaceAll("\\", "/") + (entry.isDirectory() ? "/" : ""))) {
        throw new Error(`[no-private-content] private/ file in Web build: ${relative}`);
      }
      if (entry.isDirectory()) {
        inspect(file);
      } else {
        assertSafeFileContents(file);
      }
    }
  }
  inspect(outDir);
}

/** 通常・Worker の import と書き出し後の成果物を検査し、違反した Web build を失敗させる。 */
export function noPrivateContent(): Plugin {
  let outDir = "";
  let write = false;
  let failed = false;
  return {
    name: "no-private-content",
    apply: "build",
    enforce: "pre",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      // worker の出力は親のビルドがまとめて書き出すため、親で一度だけ検査する。
      write = config.build.write && !config.isWorker;
    },
    transform(_code, id) {
      const source = id.split("?")[0].replaceAll("\\", "/");
      if (PRIVATE_MODULE.test(source)) {
        this.error(`[no-private-content] Web must fetch assignment data from the API: ${source}`);
      }
      // ?url の小さなバイナリは data URL になるので、エンコード前のファイルも検査する。
      // Vite の仮想モジュールは実ファイルを持たないため、ここでは読み出さない。
      if (path.isAbsolute(source) && existsSync(source)) assertSafeFileContents(source);
      return null;
    },
    buildEnd(error) {
      failed = Boolean(error);
    },
    closeBundle() {
      if (write && !failed) assertSafeWebBuild(outDir);
    },
  };
}
