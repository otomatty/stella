/**
 * JavaScript ランナー (#105)。
 *
 * `CodeRunner` 実装としてブラウザ内 QuickJS (Web Worker 経由) に採点を委譲する薄いラッパ。
 * 実体は `lib/run-tests-local.ts` → `lib/quickjs-worker.ts` に存在し、 ここでは
 * 「入口ファイルの content を 1 本の `code` 文字列に取り出し、 RunTestsRequest に詰めて投げる」
 * 役割のみを持つ。
 *
 * freerun モード (採点せず stdout だけ取る) は QuickJS ランナーが `mode: "freerun"` を
 * サポートしているので、 そのまま透過。
 */

import type { CodeRunner, RunInput, RunOutput } from "@falcon/shared/runner/types";

import { runTestsLocally } from "../run-tests-local.js";

export const jsRunner: CodeRunner = {
  language: "javascript",
  async run(input: RunInput): Promise<RunOutput> {
    // entryFile が files に無い場合に空文字フォールバックすると、 設定ミスを
    // 「空コードで採点」として黙って通してしまう。 構造化エラーで明示的に伝える。
    if (!Object.prototype.hasOwnProperty.call(input.files, input.entryFile)) {
      const known = Object.keys(input.files).join(", ") || "(none)";
      return {
        durationMs: 0,
        results: [
          {
            name: "runner-input",
            passed: false,
            error: `RUNNER_ERROR: entryFile "${input.entryFile}" not found in files (known: ${known})`,
          },
        ],
      };
    }
    const code = input.files[input.entryFile];
    return runTestsLocally({
      code,
      testKind: input.testKind,
      tests: input.tests,
      entryPoints: input.entryPoints,
      mode: input.mode,
    });
  },
};
