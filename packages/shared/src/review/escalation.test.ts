import { describe, expect, it } from "vitest";

import {
  ESCALATION_PRIORITY,
  MAX_ESCALATION_CODE_LENGTH,
  buildEscalationSubmissionBody,
  concatExerciseFiles,
  nextSubmissionAttempt,
} from "./escalation.js";

describe("concatExerciseFiles", () => {
  it("単一ファイルは見出しを付けずそのまま返す", () => {
    expect(concatExerciseFiles({ "main.js": "const a = 1;" })).toBe("const a = 1;");
  });

  it("複数ファイルは入口ファイルを先頭にして見出し付きで連結する", () => {
    const code = concatExerciseFiles(
      { "lib/util.js": "export const x = 1;", "main.js": "import './lib/util.js';" },
      "main.js",
    );
    expect(code).toBe(
      [
        "// ===== main.js =====",
        "import './lib/util.js';",
        "",
        "// ===== lib/util.js =====",
        "export const x = 1;",
      ].join("\n"),
    );
  });

  it("入口ファイルが無ければパス順に並べる", () => {
    const code = concatExerciseFiles({ "b.js": "b", "a.js": "a" });
    expect(code.indexOf("a.js")).toBeLessThan(code.indexOf("b.js"));
  });

  it("ファイルが無ければ空文字", () => {
    expect(concatExerciseFiles({})).toBe("");
  });

  it("上限を超えたら切り詰めて省略を明示する", () => {
    const code = concatExerciseFiles({ "main.js": "x".repeat(500) }, undefined, 60);
    expect(code.startsWith("x")).toBe(true);
    expect(code).toContain("省略");
  });

  // 省略 footer を足して上限を超えると、 同じ上限を持つ AI 下書き API が 400 を返す。
  it("省略の注記を足しても上限を超えない", () => {
    for (const maxLength of [5, 40, 60, 200]) {
      const code = concatExerciseFiles({ "main.js": "x".repeat(1000) }, undefined, maxLength);
      expect(code.length).toBeLessThanOrEqual(maxLength);
    }
  });

  it("既定の上限は AI 下書きのコード上限と同じ", () => {
    expect(MAX_ESCALATION_CODE_LENGTH).toBe(80_000);
  });
});

describe("buildEscalationSubmissionBody", () => {
  it("優先度 high・attempt 1 で送り、任意項目は null に落とす", () => {
    const body = buildEscalationSubmissionBody({
      assignmentId: "a1",
      stageTitle: "TypeScript 入門研修",
      assignmentTitle: "配列の合計",
      files: { "main.js": "const a = 1;" },
    });
    expect(body).toEqual({
      lessonId: null,
      assignmentId: "a1",
      stageTitle: "TypeScript 入門研修",
      sectionTitle: null,
      assignmentTitle: "配列の合計",
      code: "const a = 1;",
      priority: ESCALATION_PRIORITY,
      attempt: 1,
      gradingSummary: null,
    });
  });
});

describe("nextSubmissionAttempt", () => {
  it("過去提出が無ければ 1", () => {
    expect(nextSubmissionAttempt(null)).toBe(1);
  });

  it("要求 attempt を尊重する (Web 提出の既存経路)", () => {
    expect(nextSubmissionAttempt(null, 3)).toBe(3);
  });

  it("過去提出があれば 1 つ進める", () => {
    expect(nextSubmissionAttempt({ attempt: 2 })).toBe(3);
  });

  it("壊れた attempt は 1 として扱う", () => {
    expect(nextSubmissionAttempt(null, Number.NaN)).toBe(1);
    expect(nextSubmissionAttempt(null, -5)).toBe(1);
    expect(nextSubmissionAttempt({ attempt: 0 })).toBe(2);
  });
});
