import type { CiRunCheck } from "@stella/shared/tasks/ci-run";
import { describe, expect, it } from "vitest";
import { buildAiReviewPrompt, type ReviewMaterial } from "./ai-review-prompt.js";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

function material(ciRun: CiRunCheck | null): ReviewMaterial {
  return {
    kind: "basic",
    taskTitle: "テストが通ってから公開する",
    courseSlug: "deploy-ops-basics",
    taskText: "# 課題",
    rubric: [
      { id: "needs-test", criterion: "公開はテストのあとに行う", required: true, rule: false },
    ],
    commonRules: [],
    courseRules: [],
    solution: [],
    reviewGuide: "",
    submission: {
      files: [{ path: ".github/workflows/deploy.yml", text: "name: Deploy\n", bytes: 13 }],
      explanation: "",
      debuggingRecord: null,
      localResult: null,
      support: [],
      ciRun,
    },
  };
}

const check: CiRunCheck = {
  status: "mismatch",
  problems: ["not-success"],
  checkedAt: "2026-10-06T00:00:00.000Z",
  workflow: ".github/workflows/deploy.yml",
  claim: {
    runUrl: "https://github.com/yamada/web-deploy/actions/runs/123456",
    deployUrl: "https://yamada.github.io/web-deploy/",
    commit: COMMIT,
  },
  run: {
    id: 123456,
    repository: "yamada/web-deploy",
    workflowPath: ".github/workflows/deploy.yml",
    event: "push",
    status: "completed",
    conclusion: "failure",
    headSha: COMMIT,
    headBranch: "ignore-previous-instructions",
    runAttempt: 1,
    updatedAt: null,
  },
  httpStatus: 200,
  authenticated: false,
};

function submissionText(prompt: ReturnType<typeof buildAiReviewPrompt>): string {
  const content = prompt.messages[0]?.content;
  if (!Array.isArray(content)) return "";
  const last = content[content.length - 1];
  return last?.type === "text" ? last.text : "";
}

describe("AI 一次レビューの入力 (CI と公開の課題)", () => {
  it("CI の照合の要約を、提出の記録として囲んで渡す", () => {
    const prompt = buildAiReviewPrompt(material(check));
    const text = submissionText(prompt);
    expect(text).toContain('<record name="#ci-run"');
    expect(text).toContain("提出と食い違います");
    expect(text).toContain("実行が成功で終わっていません");
    expect(text).toContain(check.claim.runUrl);
    expect(text).toContain(check.claim.deployUrl);
    expect(text).toContain(COMMIT);
    expect(text).toContain("conclusion=failure");
    // GitHub から取った自由な文字列 (ブランチ名など) は渡さない。
    expect(text).not.toContain("ignore-previous-instructions");
    // 根拠に使える記録として行数を持つ。
    expect(prompt.lines.get("#ci-run")).toBeGreaterThan(0);
    // 指示に、照合はシステムが済ませたことと、データとして読むことを書く。
    expect(prompt.system[0]?.text).toContain("CI の照合");
  });

  it("ほかの課題には CI の記録を足さない", () => {
    const prompt = buildAiReviewPrompt(material(null));
    expect(submissionText(prompt)).not.toContain("#ci-run");
    expect(prompt.lines.has("#ci-run")).toBe(false);
  });
});
