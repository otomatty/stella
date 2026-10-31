import { describe, expect, test } from "vitest";
import { compareRuns, exactMatch, runEval } from "../src/eval.js";

const cases = [
  { id: "c1", input: "請求書が届きません", expected: "請求" },
  { id: "c2", input: "荷物がまだ来ません", expected: "配送" },
  { id: "c3", input: "パスワードを忘れました", expected: "アカウント" },
  { id: "c4", input: "こんにちは", expected: "その他" },
];

// 入力ごとの答えを表で返す、偽の「評価する仕組み」。
const fakeGenerate = (answers) => async (input) => answers[input];

const before = {
  請求書が届きません: "請求",
  荷物がまだ来ません: "配送",
  パスワードを忘れました: "その他",
  こんにちは: "その他",
};

describe("exactMatch", () => {
  test("前後の空白を除いて、期待する答えと比べる", () => {
    expect(exactMatch(" 請求\n", { expected: "請求" })).toBe(true);
    expect(exactMatch("請求書", { expected: "請求" })).toBe(false);
  });
});

describe("runEval", () => {
  test("すべてのケースを順に回し、合格の数と合格率を出す", async () => {
    const result = await runEval(cases, fakeGenerate(before), exactMatch);
    expect(result.total).toBe(4);
    expect(result.passed).toBe(3);
    expect(result.rate).toBeCloseTo(0.75, 10);
    expect(result.results).toEqual([
      { id: "c1", pass: true, output: "請求" },
      { id: "c2", pass: true, output: "配送" },
      { id: "c3", pass: false, output: "その他" },
      { id: "c4", pass: true, output: "その他" },
    ]);
  });

  test("答えを作る関数には、ケースの入力を順に渡す", async () => {
    const seen = [];
    await runEval(
      cases,
      async (input) => {
        seen.push(input);
        return "その他";
      },
      exactMatch,
    );
    expect(seen).toEqual(cases.map((testCase) => testCase.input));
  });

  test("採点の関数が async でも使える", async () => {
    const grade = async (output, testCase) => output === testCase.expected;
    const result = await runEval(cases, fakeGenerate(before), grade);
    expect(result.passed).toBe(3);
  });

  test("答えを作る関数が失敗したケースは、不合格にして理由を残し、残りを回す", async () => {
    const generate = async (input) => {
      if (input === "荷物がまだ来ません")
        throw new Error("タイムアウトしました");
      return before[input];
    };
    const result = await runEval(cases, generate, exactMatch);
    expect(result.results[1]).toEqual({
      id: "c2",
      pass: false,
      output: null,
      error: "タイムアウトしました",
    });
    expect(result.results).toHaveLength(4);
    expect(result.passed).toBe(2);
    expect(result.rate).toBeCloseTo(0.5, 10);
  });

  test("ケースの ID が重なっていたら、回す前にエラーにする", async () => {
    const seen = [];
    await expect(
      runEval(
        [cases[0], { ...cases[1], id: "c1" }],
        async (input) => {
          seen.push(input);
          return "";
        },
        exactMatch,
      ),
    ).rejects.toThrow(/c1/);
    expect(seen).toHaveLength(0);
  });

  test("ケースがなければ、エラーにする", async () => {
    await expect(
      runEval([], fakeGenerate(before), exactMatch),
    ).rejects.toThrow();
  });
});

describe("compareRuns", () => {
  const after = {
    ...before,
    パスワードを忘れました: "アカウント",
    こんにちは: "挨拶",
  };

  test("合格率の差と、悪化したケース・直ったケースを返す", async () => {
    const first = await runEval(cases, fakeGenerate(before), exactMatch);
    const second = await runEval(cases, fakeGenerate(after), exactMatch);
    const diff = compareRuns(first, second);
    expect(diff.before).toBeCloseTo(0.75, 10);
    expect(diff.after).toBeCloseTo(0.75, 10);
    expect(diff.delta).toBeCloseTo(0, 10);
    expect(diff.regressions).toEqual(["c4"]);
    expect(diff.fixes).toEqual(["c3"]);
  });

  test("ケースの並びが違っても、ID で結んで比べる", async () => {
    const first = await runEval(cases, fakeGenerate(before), exactMatch);
    const second = await runEval(
      [...cases].reverse(),
      fakeGenerate(after),
      exactMatch,
    );
    const diff = compareRuns(first, second);
    expect(diff.regressions).toEqual(["c4"]);
    expect(diff.fixes).toEqual(["c3"]);
  });

  test("前と後でケースが違えば、比べずにエラーにする", async () => {
    const first = await runEval(cases, fakeGenerate(before), exactMatch);
    const second = await runEval(
      cases.slice(0, 3),
      fakeGenerate(after),
      exactMatch,
    );
    expect(() => compareRuns(first, second)).toThrow();
    const renamed = await runEval(
      cases.map((testCase, i) =>
        i === 0 ? { ...testCase, id: "c9" } : testCase,
      ),
      fakeGenerate(after),
      exactMatch,
    );
    expect(() => compareRuns(first, renamed)).toThrow();
  });
});
