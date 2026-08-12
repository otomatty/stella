/**
 * TypeScript ランナー。
 *
 * 入口ファイルを JS に落としてから `jsRunner` (QuickJS in Worker) に委譲するだけの薄いラッパ。
 * QuickJS は TS を実行できないので、 実行前に型注釈を落とす必要がある。
 *
 * ponytail: トランスパイルは worker ではなくここ (メインスレッド) で行う。
 *   worker が受け取る `RunTestsRequest` には language が無く、 worker で分岐するには
 *   `RunInput` / `RunTestsRequest` / validator (= `/api/run-tests` の契約) を広げる必要がある。
 *   `typescript` は動的 import なので初期バンドルには入らず、 TS 課題の初回実行時だけロードされる。
 *   メインスレッドの占有が問題になったら上記の契約拡張 + worker 側分岐へ移す。
 */

import type { CodeRunner, RunInput, RunOutput } from "@falcon/shared/runner/types";

import { jsRunner } from "./js-runner.js";

export const tsRunner: CodeRunner = {
  language: "typescript",
  async run(input: RunInput): Promise<RunOutput> {
    const source = input.files[input.entryFile];
    if (source === undefined) {
      // entryFile 欠落は jsRunner が構造化エラーで返すので、 ここで空文字を捏造せず委譲する。
      return jsRunner.run(input);
    }
    const { transpileTypeScript } = await import("../transpile.js");
    return jsRunner.run({
      ...input,
      files: { ...input.files, [input.entryFile]: transpileTypeScript(source) },
    });
  },
};
