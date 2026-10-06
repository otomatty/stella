/**
 * Web の配信物に課題の解答を混ぜない (#35)。遅延 import や raw import も拒否し、
 * 最後に publicDir・worker・source map を含む書き出し済みの成果物を検査する。
 * 新形式の課題のヒント (`tasks/<課題>/hints.md`) も、解放条件を満たした受講者にだけ API が返す
 * 素材なので (#36)、`private/` と同じく取り込ませない。
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const PRIVATE_MODULE =
  /(?:^|\/)packages\/shared\/src\/(?:assignments\.ts$|problems(?:\/|$))|(?:^|\/)packages\/content\/(?:.*\/)?(?:private(?:\/|$)|tasks\/[^/]+\/hints\.md$)/;
const PRIVATE_PATH = /(?:^|[/\\])private[/\\]/;
// JS の正規表現 /private\(set\)/ をパスと誤認しない。Windows のパスは
// JS / JSON 内ではバックスラッシュが 2 個にエスケープされる。
// 引用符・バッククォート直後の相対パスも検出する。
const PRIVATE_REFERENCE = /(?:^|[/\\"'`])private(?:\/|\\\\)/;
const ANSWER_PROPERTY = /(?:\b(?:solution|badSolutions)|["'](?:solution|badSolutions)["'])\s*:/;
// 新形式の課題のヒント (#36)。publicDir や別の手順でコピーされると transform を通らないので、
// 書き出し済みの成果物でもパスと中身を見る。パスは `tasks/<課題>/hints.md`。
const HINTS_PATH = /(?:^|\/)tasks\/[^/]+\/hints\.md$/;
// 中身は hints.md の段の見出し「## ヒント<番号>」が行頭 (JS の文字列では `\n` の直後) にあること。
// 「解法のヒント」のような語や、番号の無い見出しは通す。ファイルは Latin-1 で読むので、
// UTF-8 のバイト列と、ASCII に逃がした `\u30d2\u30f3\u30c8` の両方を探す。
const HINT_WORD = `(?:${Buffer.from("ヒント", "utf8").toString("latin1")}|\\\\u30[dD]2\\\\u30[fF]3\\\\u30[cC]8)`;
const HINT_HEADING = new RegExp(`(?:^|\\\\n)##[ \\t]+${HINT_WORD}[ \\t]*\\d`, "m");

/** バイナリを含む全ファイルの ASCII マーカーを検査し、解答や private/ があれば拒否する。 */
function assertSafeFileContents(file: string): void {
  // Latin-1 は各バイトをそのまま文字へ写す。拡張子や UTF-8 としての妥当性に依存しない。
  const contents = readFileSync(file, "latin1");
  if (ANSWER_PROPERTY.test(contents) || PRIVATE_REFERENCE.test(contents)) {
    throw new Error(`[no-private-content] answer or private/ content: ${file}`);
  }
  if (HINT_HEADING.test(contents)) {
    throw new Error(`[no-private-content] task hints (hints.md) content: ${file}`);
  }
}

/** CLI を通らない Vite build でも検査するため、build plugin から呼ぶ。 */
export function assertSafeWebBuild(outDir: string): void {
  function inspect(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const relative = path.relative(outDir, file);
      const normalized = relative.replaceAll("\\", "/");
      if (PRIVATE_PATH.test(normalized + (entry.isDirectory() ? "/" : ""))) {
        throw new Error(`[no-private-content] private/ file in Web build: ${relative}`);
      }
      if (!entry.isDirectory() && HINTS_PATH.test(normalized)) {
        throw new Error(`[no-private-content] task hints (hints.md) in Web build: ${relative}`);
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
