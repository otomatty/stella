import { describe, expect, it } from "vitest";
import {
  countHelpAttempts,
  helpItemAvailability,
  intersectHelpAccess,
  parseHelpContentHash,
  parseHelpOpenRequest,
  parseTaskHints,
  SOLUTION_UNLOCK_ATTEMPTS,
  staleHelpAccess,
  supportConfigOf,
  TASK_HELP_POLICIES,
  type TaskHelpFacts,
  taskHelpAccess,
} from "./help.js";
import { TASK_KINDS } from "./manifest.js";

const facts = (overrides: Partial<TaskHelpFacts> = {}): TaskHelpFacts => ({
  kind: "basic",
  support: { hintLevels: 2, solutionUnlock: "after-hints" },
  passed: false,
  attempts: 0,
  openedHintLevel: 0,
  ...overrides,
});

describe("taskHelpAccess (07 §8 の表)", () => {
  it("すべての種別に方針がある", () => {
    for (const kind of TASK_KINDS) expect(TASK_HELP_POLICIES[kind]).toBeDefined();
  });

  it("基礎・接続はヒントを 1 段ずつ開け、最後まで開くと解答例を開ける", () => {
    for (const kind of ["basic", "connection"] as const) {
      const start = taskHelpAccess(facts({ kind }));
      expect(start.hints).toEqual([{ open: true }, { open: false, reason: "previous-hint" }]);
      expect(start.solution).toEqual({ open: false, reason: "hints-first" });
      expect(start.explanation).toEqual({ open: false, reason: "passed" });
      expect(taskHelpAccess(facts({ kind, openedHintLevel: 1 })).hints[1]).toEqual({ open: true });
      expect(taskHelpAccess(facts({ kind, openedHintLevel: 2 })).solution).toEqual({ open: true });
    }
  });

  it("基礎で解答例を合格後にした課題は、ヒントを開き切っても解答例を開けない", () => {
    const access = taskHelpAccess(
      facts({ support: { hintLevels: 1, solutionUnlock: "passed" }, openedHintLevel: 1 }),
    );
    expect(access.solution).toEqual({ open: false, reason: "passed" });
  });

  it("基礎・接続は合格後に解答例と解説を自動で開く", () => {
    const access = taskHelpAccess(facts({ passed: true }));
    expect(access.phase).toBe("passed");
    expect(access.solution).toEqual({ open: true });
    expect(access.explanation).toEqual({ open: true });
    expect(access.autoOpen).toEqual(["solution", "explanation"]);
  });

  it("自力・修正は決まった回数の挑戦のあとか合格後に解答例を開け、自動では開かない", () => {
    for (const kind of ["independent", "debug"] as const) {
      const support = { hintLevels: 1, solutionUnlock: "attempts-or-passed" as const };
      const before = taskHelpAccess(
        facts({ kind, support, attempts: SOLUTION_UNLOCK_ATTEMPTS - 1, openedHintLevel: 1 }),
      );
      expect(before.solution).toEqual({ open: false, reason: "attempts" });
      expect(before.attempts).toEqual({
        count: SOLUTION_UNLOCK_ATTEMPTS - 1,
        required: SOLUTION_UNLOCK_ATTEMPTS,
      });
      expect(before.hints).toEqual([{ open: true }]);
      expect(
        taskHelpAccess(facts({ kind, support, attempts: SOLUTION_UNLOCK_ATTEMPTS })).solution,
      ).toEqual({ open: true });
      // 課題ごとの回数で上書きできる。
      expect(
        taskHelpAccess(facts({ kind, support: { ...support, attempts: 2 }, attempts: 2 })).solution,
      ).toEqual({ open: true });
      const passed = taskHelpAccess(facts({ kind, support, passed: true }));
      expect(passed.solution).toEqual({ open: true });
      expect(passed.explanation).toEqual({ open: true });
      expect(passed.autoOpen).toEqual([]);
    }
  });

  it("自力で解答例を合格後にした課題は、挑戦の回数では開かない", () => {
    const access = taskHelpAccess(
      facts({
        kind: "independent",
        support: { hintLevels: 0, solutionUnlock: "passed" },
        attempts: 100,
      }),
    );
    expect(access.solution).toEqual({ open: false, reason: "passed" });
    expect(access.attempts).toBeNull();
  });

  it("統合は取り組み中に参照元だけで、合格後に解答例 (解説は出さない)", () => {
    const support = { hintLevels: 3, solutionUnlock: "after-hints" as const };
    const working = taskHelpAccess(
      facts({ kind: "integration", support, openedHintLevel: 3, attempts: 99 }),
    );
    expect(working.referencesOnly).toBe(true);
    expect(working.notice).toContain("仕様・状態見本・API 契約");
    // 教材がヒントや早い解放を書いていても、種別の方針で止める。
    expect(working.hints).toEqual([]);
    expect(working.solution).toEqual({ open: false, reason: "passed" });
    const passed = taskHelpAccess(facts({ kind: "integration", support, passed: true }));
    expect(passed.solution).toEqual({ open: true });
    expect(passed.explanation).toEqual({ open: false, reason: "not-offered" });
  });

  it("確認A・Bは取り組み中に何も開けず、確認Aだけ合格後に解答例を開ける", () => {
    for (const kind of ["assessment-a", "assessment-b"] as const) {
      const working = taskHelpAccess(
        facts({
          kind,
          support: { hintLevels: 2, solutionUnlock: "attempts-or-passed" },
          attempts: 99,
          openedHintLevel: 2,
        }),
      );
      expect(working.referencesOnly).toBe(true);
      expect(working.hints).toEqual([]);
      expect(working.solution.open).toBe(false);
      expect(working.explanation.open).toBe(false);
      expect(working.attempts).toBeNull();
    }
    expect(taskHelpAccess(facts({ kind: "assessment-a", passed: true })).solution).toEqual({
      open: true,
    });
    const b = taskHelpAccess(facts({ kind: "assessment-b", passed: true }));
    expect(b.solution).toEqual({ open: false, reason: "not-offered" });
    expect(b.explanation).toEqual({ open: false, reason: "not-offered" });
    expect(b.autoOpen).toEqual([]);
  });

  it("素材 1 つの可否を引ける", () => {
    const access = taskHelpAccess(facts({ openedHintLevel: 1 }));
    expect(helpItemAvailability(access, "hint", 2)).toEqual({ open: true });
    expect(helpItemAvailability(access, "hint", 3).open).toBe(false);
    expect(helpItemAvailability(access, "hint").open).toBe(false);
    expect(helpItemAvailability(access, "solution").open).toBe(false);
  });
});

describe("intersectHelpAccess / staleHelpAccess", () => {
  it("今の版と手元の版の両方で開けるものだけを開ける", () => {
    const basic = taskHelpAccess(facts({ openedHintLevel: 2 }));
    const assessment = taskHelpAccess(
      facts({ kind: "assessment-a", support: { hintLevels: 0, solutionUnlock: "passed" } }),
    );
    const both = intersectHelpAccess(basic, assessment);
    expect(both.referencesOnly).toBe(true);
    expect(both.hints).toEqual([]);
    expect(both.solution).toEqual({ open: false, reason: "passed" });
    expect(intersectHelpAccess(assessment, basic).solution.open).toBe(false);
    const stricter = taskHelpAccess(
      facts({ support: { hintLevels: 1, solutionUnlock: "passed" }, openedHintLevel: 1 }),
    );
    expect(intersectHelpAccess(basic, stricter).hints).toEqual([{ open: true }]);
    expect(intersectHelpAccess(basic, stricter).solution).toEqual({
      open: false,
      reason: "passed",
    });
    const passed = taskHelpAccess(facts({ passed: true }));
    expect(intersectHelpAccess(passed, passed).autoOpen).toEqual(["solution", "explanation"]);
  });

  it("素材の版が分からなければ、段の数だけ見せてすべて閉じる", () => {
    const stale = staleHelpAccess(taskHelpAccess(facts({ passed: true, openedHintLevel: 2 })));
    expect(stale.hints).toEqual([
      { open: false, reason: "stale-version" },
      { open: false, reason: "stale-version" },
    ]);
    expect(stale.solution).toEqual({ open: false, reason: "stale-version" });
    expect(stale.explanation).toEqual({ open: false, reason: "stale-version" });
    expect(stale.autoOpen).toEqual([]);
  });
});

describe("countHelpAttempts", () => {
  it("手元の確認の失敗と提出の試行を足す", () => {
    expect(countHelpAttempts({ failedLocalRuns: 3, submissions: 2 })).toBe(5);
    expect(countHelpAttempts({ failedLocalRuns: -1, submissions: 0 })).toBe(0);
  });
});

describe("parseTaskHints", () => {
  it("## ヒント<番号> <題> で段に分ける", () => {
    const parsed = parseTaskHints(
      "<!-- 段の題は任意 -->\n## ヒント1 方針\n\n見出しは h1 です。\n\n## ヒント2 手がかりのコード\n\n```html\n## これは見出しではない\n<h1>…</h1>\n```\n\n### 補足\n保存します。\n",
    );
    expect(parsed).toEqual({
      ok: true,
      hints: [
        { level: 1, title: "方針", markdown: "見出しは h1 です。" },
        {
          level: 2,
          title: "手がかりのコード",
          markdown: "```html\n## これは見出しではない\n<h1>…</h1>\n```\n\n### 補足\n保存します。",
        },
      ],
    });
  });

  it("題の無い見出しは ヒント<番号> を題にする", () => {
    expect(parseTaskHints("## ヒント1\n本文\n")).toEqual({
      ok: true,
      hints: [{ level: 1, title: "ヒント1", markdown: "本文" }],
    });
  });

  it("空・コメントだけの hints.md は 0 段", () => {
    expect(parseTaskHints("")).toEqual({ ok: true, hints: [] });
    expect(parseTaskHints("<!-- 確認A・B はヒントを置かない -->\n")).toEqual({
      ok: true,
      hints: [],
    });
  });

  it.each([
    ["前置きの本文", "はじめに\n## ヒント1\n本文", "より前に本文"],
    ["番号の飛び", "## ヒント1\nA\n## ヒント3\nB", "1 から順"],
    ["本文の無い段", "## ヒント1\n\n## ヒント2\nB", "ヒント1 の本文"],
    ["ほかの h2", "## ヒント1\nA\n## 解答\nB", "見出しは"],
    ["h1", "# ヒント\n## ヒント1\nA", "見出しは"],
    ["閉じないコードブロック", "## ヒント1\n```js\nconst a = 1;\n", "閉じていません"],
  ])("%s は形の誤りにする", (_label, markdown, message) => {
    const parsed = parseTaskHints(markdown);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors.join("\n")).toContain(message);
  });
});

describe("parseHelpOpenRequest", () => {
  it("素材の種類と段を検証する", () => {
    expect(parseHelpOpenRequest({ taskId: "a/b/c", item: "hint", level: 2 })).toEqual({
      taskId: "a/b/c",
      item: "hint",
      level: 2,
    });
    expect(parseHelpOpenRequest({ taskId: "a/b/c", item: "solution", level: 9 })).toEqual({
      taskId: "a/b/c",
      item: "solution",
    });
    expect(
      parseHelpOpenRequest({ taskId: "a/b/c", item: "explanation", contentHash: "d".repeat(64) }),
    ).toEqual({ taskId: "a/b/c", item: "explanation", contentHash: "d".repeat(64) });
    expect(parseHelpContentHash(undefined)).toBeUndefined();
    expect(() => parseHelpContentHash("../x")).toThrow("contentHash");
    for (const raw of [
      null,
      { taskId: "a/b/c", item: "solution", contentHash: "A".repeat(64) },
      { taskId: "a/b/c", item: "variants" },
      { taskId: "a/b/c", item: "review" },
      { taskId: "a/b/c", item: "hint" },
      { taskId: "a/b/c", item: "hint", level: 0 },
      { taskId: "a/b/c", item: "hint", level: 1.5 },
      { item: "solution" },
    ])
      expect(() => parseHelpOpenRequest(raw)).toThrow();
  });
});

describe("supportConfigOf", () => {
  it("定義の support を読み、読めなければ最も厳しい設定にする", () => {
    expect(
      supportConfigOf({ support: { hintLevels: 2, solutionUnlock: "after-hints", attempts: 3 } }),
    ).toEqual({ hintLevels: 2, solutionUnlock: "after-hints", attempts: 3 });
    expect(supportConfigOf({})).toEqual({ hintLevels: 0, solutionUnlock: "passed" });
    expect(supportConfigOf({ support: { hintLevels: -1, solutionUnlock: "now" } })).toEqual({
      hintLevels: 0,
      solutionUnlock: "passed",
    });
  });
});
