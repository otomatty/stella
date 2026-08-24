/**
 * 擬似言語 (基本情報技術者試験 科目B) ランナー (#133)。
 *
 * `ts-runner` と同じ構図で、 入口ファイルを JS に落としてから `jsRunner`
 * (QuickJS in Worker) に委譲するだけの薄いラッパ。 実行基盤・サンドボックス・
 * タイムアウトは既存のものをそのまま使い、 新しいランタイムは持ち込まない。
 *
 * 構文エラーは例外にせず、 テストごとの構造化エラーとして返す。 例外にすると
 * 採点 UI 側で `RUNNER_ERROR: <生メッセージ>` に潰れてしまい、 学習者に
 * 「何行目の何が悪いのか」 が伝わらないため。
 */

import type { CodeRunner, RunInput, RunOutput } from "@falcon/shared/runner/types";
import type { TestResult } from "@falcon/shared/types";

import { FePseudoError, transpileFePseudo } from "../fe-pseudo/index.js";
import { jsRunner } from "./js-runner.js";

function syntaxErrorOutput(error: unknown, input: RunInput): RunOutput {
  const message =
    error instanceof FePseudoError
      ? error.toDisplayString()
      : error instanceof Error
        ? error.message
        : String(error);

  const names =
    input.mode === "freerun" || input.tests.length === 0
      ? ["freerun"]
      : input.tests.map((test) => test.name);

  const results: TestResult[] = names.map((name) => ({
    name,
    passed: false,
    error: `SYNTAX_ERROR: ${message}`,
  }));

  return { durationMs: 0, results };
}

export const fePseudoRunner: CodeRunner = {
  language: "fe-pseudo",
  async run(input: RunInput): Promise<RunOutput> {
    const source = input.files[input.entryFile];
    if (source === undefined) {
      // entryFile 欠落は jsRunner が構造化エラーで返すので、 ここで空文字を捏造せず委譲する。
      return jsRunner.run(input);
    }

    let code: string;
    try {
      code = transpileFePseudo(source);
    } catch (error) {
      return syntaxErrorOutput(error, input);
    }

    return jsRunner.run({
      ...input,
      files: { ...input.files, [input.entryFile]: code },
    });
  },
};
