import { describe, expect, it } from "vitest";
import { presentProblemStep, problemStatementFromSource } from "./problem-steps.js";
import type { LockStep } from "./step-lock.js";

describe("問題ファイルの冒頭コメント", () => {
  it("TypeScript の見出しと続きの行だけを読む", () => {
    expect(
      problemStatementFromSource(
        "\n// 課題の雛形\n// 問1 足す\n// 2つの数を足す。\n//\n// 例: add(1, 2) → 3\n\n// 実装のメモ\nexport const add = 0;",
      ),
    ).toEqual({ heading: "問1 足す", details: ["2つの数を足す。", "", "例: add(1, 2) → 3"] });
  });

  it("C# の番号つき見出しを CRLF でも読む", () => {
    expect(
      problemStatementFromSource("// Q01 ★ 差\r\n// 2つの整数の差を返す。\r\nnamespace Exercises;"),
    ).toEqual({ heading: "Q01 ★ 差", details: ["2つの整数の差を返す。"] });
  });

  it.each(["", "export const add = 0;\n// 問1 足す", "// TODO: 実装する\nexport const add = 0;"])(
    "冒頭に問題の見出しがないときは文を返さない (%j)",
    (code) => {
      expect(problemStatementFromSource(code)).toBeUndefined();
    },
  );
});

describe("問題の解放状態", () => {
  const steps: LockStep[] = [
    { id: "video1", kind: "content", title: "最初の動画" },
    { id: "q1", kind: "problem", title: "問1" },
    { id: "video2", kind: "content", title: "次の動画" },
    { id: "q2", kind: "problem", title: "問2" },
  ];

  it("最初の未完了ステップを、種類に応じたロック状態とともに返す", () => {
    expect(presentProblemStep(steps, 3, new Set())).toEqual({
      state: "locked-video",
      blocking: steps[0],
    });
    expect(presentProblemStep(steps, 3, new Set(["video1"]))).toEqual({
      state: "locked-previous",
      blocking: steps[1],
    });
    expect(presentProblemStep(steps, 3, new Set(["video1", "q1"]))).toEqual({
      state: "locked-video",
      blocking: steps[2],
    });
  });

  it("前のステップが完了していれば開き、提出済みなら前の完了状況を問わない", () => {
    expect(presentProblemStep(steps, 3, new Set(["video1", "q1", "video2"]))).toEqual({
      state: "open",
      blocking: null,
    });
    expect(presentProblemStep(steps, 3, new Set(["q2"]))).toEqual({
      state: "submitted",
      blocking: null,
    });
  });

  it("問題以外のステップの状態は返さない", () => {
    expect(presentProblemStep(steps, 2, new Set())).toBeNull();
  });
});
