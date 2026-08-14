import { describe, expect, it, vi } from "vitest";
import { buildExercisePanelHtml } from "./exercise-panel.js";
import type { ExecutionResult } from "./grader-protocol.js";

vi.mock("vscode", () => ({
  window: { createWebviewPanel: vi.fn() },
  ViewColumn: { Beside: 2 },
}));

const failResult: ExecutionResult = {
  testResults: [
    { name: "prints ok", passed: true },
    { name: "<b>inject</b>", passed: false, error: "boom" },
  ],
  serverDurationMs: 1,
  totalDurationMs: 2,
  evaluation: {
    cleared: false,
    checks: { lintPassed: true, astPassed: true, testsPassed: false },
  },
  lintAtRun: [],
  astAtRun: { required: [], forbidden: [] },
};

const clearResult: ExecutionResult = {
  ...failResult,
  testResults: [{ name: "prints ok", passed: true }],
  evaluation: {
    cleared: true,
    checks: { lintPassed: true, astPassed: true, testsPassed: true },
  },
};

describe("buildExercisePanelHtml", () => {
  it("escapes raw HTML in the assignment prompt and does not emit scripts", () => {
    const html = buildExercisePanelHtml({
      assignmentTitle: "Demo <script>",
      description: "<script>alert(1)</script>\n# Prompt",
      courseId: "c1",
      lessonId: "l1",
    });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<h1>");
    expect(html).toContain("Prompt");
    expect(html).toContain("Demo");
  });

  it("lists grade results without a next-lesson link when not cleared", () => {
    const html = buildExercisePanelHtml({
      assignmentTitle: "Demo",
      description: "do it",
      courseId: "c1",
      lessonId: "l1",
      result: failResult,
      nextLesson: { courseId: "c1", lessonId: "l2", title: "Two" },
    });
    expect(html).toContain("未クリア");
    expect(html).toContain("prints ok");
    expect(html).toContain("&lt;b&gt;inject&lt;/b&gt;");
    expect(html).not.toContain("<b>inject</b>");
    expect(html).not.toContain("次のレッスンへ");
    expect(html).not.toMatch(/<script/i);
  });

  it("offers 次のレッスンへ via command URI when cleared", () => {
    const html = buildExercisePanelHtml({
      assignmentTitle: "Demo",
      description: "do it",
      courseId: "c1",
      lessonId: "l1",
      result: clearResult,
      nextLesson: { courseId: "c1", lessonId: "l2", title: "Two" },
    });
    expect(html).toContain("クリア");
    expect(html).toContain("次のレッスンへ");
    expect(html).toContain("command:falcon.openNextLesson");
    expect(html).toContain("c1");
    expect(html).toContain("l1");
    expect(html).not.toMatch(/<script/i);
  });
});
