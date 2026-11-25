import { describe, expect, it } from "vitest";
import { problemStatementFromSource, problemStepStates } from "./problem-steps.js";

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

describe("動画と前の提出で出る問題", () => {
  const steps = [
    { problemId: "q3", afterLessonId: "video2", position: 2 },
    { problemId: "q1", afterLessonId: "video1", position: 0 },
    { problemId: "q2", afterLessonId: "video1", position: 1 },
  ];

  it("動画が未完了なら動画を優先し、完了した動画の中では position 順に出す", () => {
    expect(problemStepStates(steps, new Set(["video1"]), new Set())).toEqual(
      new Map([
        ["q1", "open"],
        ["q2", "locked-previous"],
        ["q3", "locked-video"],
      ]),
    );
    expect(problemStepStates(steps, new Set(["video1", "video2"]), new Set()).get("q3")).toBe(
      "locked-previous",
    );
  });

  it("手で済みにした問題も提出として扱い、動画の完了より提出を優先する", () => {
    const manuallySubmitted = new Set(["q1", "q3"]);
    expect(problemStepStates(steps, new Set(["video1"]), manuallySubmitted)).toEqual(
      new Map([
        ["q1", "submitted"],
        ["q2", "open"],
        ["q3", "submitted"],
      ]),
    );
    expect(problemStepStates(steps, new Set(), manuallySubmitted).get("q1")).toBe("submitted");
  });
});
