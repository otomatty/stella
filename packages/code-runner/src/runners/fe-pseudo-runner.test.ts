/**
 * 擬似言語ランナーの入力検証まわり (#133)。
 *
 * QuickJS への委譲そのもの (jsRunner 側) はここでは触らず、 「構文エラーを
 * 例外にせず構造化エラーとして返す」 契約だけを固定する。 例外にすると採点 UI 側で
 * `RUNNER_ERROR: <生メッセージ>` に潰れて、 学習者に行番号が届かなくなる。
 */

import { describe, expect, it } from "vitest";

import { fePseudoRunner } from "./fe-pseudo-runner.js";

const BROKEN = "整数型: x ← 1\nif (x > 0)\n  x ← 2\n";

describe("fePseudoRunner", () => {
  it("language は fe-pseudo", () => {
    expect(fePseudoRunner.language).toBe("fe-pseudo");
  });

  it("構文エラーはテストごとの SYNTAX_ERROR として返る", async () => {
    const output = await fePseudoRunner.run({
      files: { "main.fe": BROKEN },
      entryFile: "main.fe",
      tests: [
        { name: "テスト1", code: "f() === 1" },
        { name: "テスト2", code: "f() === 2" },
      ],
      testKind: "function",
      mode: "test",
    });

    expect(output.results).toHaveLength(2);
    expect(output.results.map((r) => r.name)).toEqual(["テスト1", "テスト2"]);
    for (const result of output.results) {
      expect(result.passed).toBe(false);
      expect(result.error).toMatch(/^SYNTAX_ERROR: /);
      // 行番号つきの日本語メッセージであること。
      expect(result.error).toMatch(/`endif` がありません \(2 行目\)/);
    }
  });

  it("freerun では 1 件だけ返す", async () => {
    const output = await fePseudoRunner.run({
      files: { "main.fe": BROKEN },
      entryFile: "main.fe",
      tests: [],
      testKind: "stdout",
      mode: "freerun",
    });

    expect(output.results).toHaveLength(1);
    expect(output.results[0].name).toBe("freerun");
    expect(output.results[0].error).toMatch(/^SYNTAX_ERROR: /);
  });
});
