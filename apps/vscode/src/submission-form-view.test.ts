import { describe, expect, it } from "vitest";
import {
  initialSubmissionDraft,
  parseSubmissionDraft,
  REFLECTION_TEMPLATE,
  renderSubmissionForm,
  submissionDraftProblem,
} from "./submission-form-view.js";

const input = { key: "task", title: "最初のページを作る", mode: "submit" as const };
describe("提出の振り返りテンプレート", () => {
  it("未記入ならテンプレートを出し、既存の下書きは上書きしない", () => {
    expect(initialSubmissionDraft(input).explanation).toBe(REFLECTION_TEMPLATE);
    expect(
      initialSubmissionDraft({ ...input, initial: { explanation: "書きかけ" } }).explanation,
    ).toBe("書きかけ");
    expect(initialSubmissionDraft({ ...input, mode: "consult" }).explanation).toContain(
      "試したこと",
    );
  });
  it("見出しだけの提出を止め、記入した内容を受け付ける", () => {
    expect(submissionDraftProblem({ explanation: REFLECTION_TEMPLATE }, input)).toContain(
      "振り返り",
    );
    expect(
      submissionDraftProblem(
        { explanation: REFLECTION_TEMPLATE + "保存したページをブラウザーで確認しました。" },
        input,
      ),
    ).toBeUndefined();
  });
  it("修正課題の記録を同じ画面で受け取り、相談では空欄を許す", () => {
    const draft = initialSubmissionDraft({ ...input, debug: true });
    draft.explanation += "原因を調べました。";
    expect(submissionDraftProblem(draft, { ...input, debug: true })).toContain("再現手順");
    expect(
      submissionDraftProblem(draft, { ...input, debug: true, mode: "consult" }),
    ).toBeUndefined();
    expect(() =>
      parseSubmissionDraft({ explanation: "記録", debuggingRecord: { reproduction: 5 } }, true),
    ).toThrow();
  });
  it("画面から支援や保存先を指定させず、文字数を制限する", () => {
    expect(
      parseSubmissionDraft(
        { explanation: "振り返り", support: [{ kind: "solution" }], root: "outside" },
        false,
      ),
    ).toEqual({ explanation: "振り返り" });
    expect(() => parseSubmissionDraft({ explanation: "x".repeat(20_001) }, false)).toThrow(
      "20,000",
    );
  });
  it("振り返りは文字列として表示し、支援の入力欄を出さない", () => {
    const html = renderSubmissionForm(
      input,
      { explanation: '</textarea><script>alert("x")</script>' },
      {
        nonce: "test",
        cspSource: "https://local.test",
        styleUri: "https://local.test/style.css",
        scriptUri: "https://local.test/script.js",
      },
    );
    expect(html).toContain("&lt;/textarea&gt;&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain('name="support"');
    expect(html).toContain("下書きを保存");
    expect(html).toContain("script-src 'nonce-test'");
  });
});
