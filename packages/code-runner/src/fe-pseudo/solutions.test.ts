/**
 * 擬似言語課題の回帰テスト (#133)。
 *
 * `problems.test.ts` は `solution` の **存在** しか見ておらず、 模範解答が実際に
 * 全テストを通るかは検証されていない。 擬似言語課題は記法が独特で、 課題文と解答が
 * ずれても気付きにくいため、 ここで「解答を実行して採点が通る」ところまで固定する。
 *
 * 実行は QuickJS ではなく `new Function` で行う。 QuickJS の `runFunctionTest` は
 * 学習者コードを読み込んだ直後に entryPoints を束縛して式を評価するだけなので、
 * 生成 JS がトップレベル関数宣言である限り評価結果は同じになる。
 * (QuickJS 実機での動作は grader WebView / Extension Development Host で確認する)
 */

import { assignments } from "@falcon/shared/assignments";
import type { Assignment } from "@falcon/shared/types";
import { describe, expect, it } from "vitest";

import { transpileFePseudo } from "./index.js";

const fePseudoAssignments = assignments.filter((a) => a.language === "fe-pseudo");

/** 模範解答をトランスパイルし、 テスト式を評価する関数を返す。 */
function evaluatorFor(assignment: Assignment): (testCode: string) => unknown {
  const code = transpileFePseudo(assignment.solution ?? "");
  return (testCode: string) => new Function(`${code}\nreturn (${testCode});`)();
}

describe("擬似言語課題", () => {
  it("課題が登録されている", () => {
    expect(fePseudoAssignments.length).toBeGreaterThan(0);
  });

  describe.each(fePseudoAssignments.map((a) => [a.id, a] as const))("%s", (_id, assignment) => {
    it("スターターファイルは .fe で、 構文エラーにならない", () => {
      expect(assignment.entryFile).toBe("main.fe");
      for (const file of assignment.starterFiles) {
        expect(file.path.endsWith(".fe")).toBe(true);
        // 学習者が編集前に採点しても、 構文エラーではなくテスト不合格として返る状態にしておく。
        expect(() => transpileFePseudo(file.content)).not.toThrow();
      }
    });

    it("function 採点に必要な entryPoints が宣言されている", () => {
      expect(assignment.testKind).toBe("function");
      expect(assignment.entryPoints?.length).toBeGreaterThan(0);
      // entryPoints の名前が模範解答で実際に定義されていること。
      const evaluate = evaluatorFor(assignment);
      for (const name of assignment.entryPoints ?? []) {
        expect(evaluate(`typeof ${name}`)).toBe("function");
      }
    });

    it("模範解答がすべてのテストを通る", () => {
      expect(assignment.tests.length).toBeGreaterThan(0);
      const evaluate = evaluatorFor(assignment);
      for (const test of assignment.tests) {
        expect(test.code, `${assignment.id} / ${test.name} に code がない`).toBeTruthy();
        expect(evaluate(test.code as string), `${assignment.id} / ${test.name}`).toBe(true);
      }
    });

    it("ヒントが 3 つ以上ある", () => {
      expect(assignment.hints?.length ?? 0).toBeGreaterThanOrEqual(3);
    });

    it("スターターファイルのままではテストを通らない", () => {
      // 「未着手でも合格」になっていないことを確かめる (課題文と採点のずれ検知)。
      const starter = assignment.starterFiles[0]?.content ?? "";
      const code = transpileFePseudo(starter);
      const passed = assignment.tests.every((test) => {
        try {
          return new Function(`${code}\nreturn (${test.code});`)() === true;
        } catch {
          return false;
        }
      });
      expect(passed).toBe(false);
    });
  });
});
