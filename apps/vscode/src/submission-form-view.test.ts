import { describe, expect, it } from "vitest";
import {
  initialSubmissionDraft,
  parseSubmissionDraft,
  REFLECTION_TEMPLATE,
  renderSubmissionForm,
  submissionDraftProblem,
} from "./submission-form-view.js";

const input = { key: "task", title: "最初のページを作る", mode: "submit" as const };
const assets = {
  nonce: "test",
  cspSource: "https://local.test",
  styleUri: "https://local.test/style.css",
  scriptUri: "https://local.test/script.js",
};
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
  it.each([true, false, "true", 1, null])("共有の下書きは真偽値だけを残す (%j)", (value) => {
    const draft = parseSubmissionDraft({ explanation: "振り返り", shareReflection: value }, false);
    const restored = initialSubmissionDraft({ ...input, initial: draft });
    if (typeof value === "boolean") expect(restored.shareReflection).toBe(value);
    else expect(restored).not.toHaveProperty("shareReflection");
  });

  it("対象の提出に共有欄を用意し、既定はオフで、保存したオンを復元する", () => {
    const sharingInput = { ...input, reflectionSharing: { session: 7 } };
    const html = renderSubmissionForm(sharingInput, initialSubmissionDraft(sharingInput), assets);
    expect(html).toContain('id="reflection-sharing" hidden');
    expect(html).toContain('type="checkbox" id="share-reflection"');
    expect(html).toContain("この振り返りをグループのタイムラインに共有する");
    expect(html).toContain("あとから Web のタイムラインで共有をやめられます。");
    expect(html).not.toContain('description" checked');
    expect(
      renderSubmissionForm(
        sharingInput,
        { explanation: "保存済み", shareReflection: true },
        assets,
      ),
    ).toContain('description" checked');
    for (const formInput of [input, { ...sharingInput, mode: "consult" as const }]) {
      expect(
        renderSubmissionForm(formInput, initialSubmissionDraft(formInput), assets),
      ).not.toContain('id="reflection-sharing"');
    }
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
    expect(html).toContain("この内容で提出する");
    expect(html).toContain("✓ 確認はすべて通りました</p><h1>");
    expect(html).toContain("script-src 'nonce-test'");
  });

  it.each([
    ["submit", "この内容で提出する"],
    ["consult", "相談を送る"],
  ] as const)("%s の操作バーをフォーム内の見出しより前に出す", (mode, submitLabel) => {
    const formInput = { ...input, mode };
    const html = renderSubmissionForm(formInput, initialSubmissionDraft(formInput), {
      nonce: "test",
      cspSource: "https://local.test",
      styleUri: "https://local.test/style.css",
      scriptUri: "https://local.test/script.js",
    });
    const actionBar = html.match(
      /<form id="submission-form"><div class="action-bar">(.*?)<\/div><header>/,
    )?.[1];
    expect(actionBar).toContain('id="form-status" role="status" aria-live="polite"');
    expect(actionBar).toContain(
      `id="save-draft">下書きを保存</button><button type="submit" class="primary" id="submit">${submitLabel}</button>`,
    );
    expect(html.match(/id="submit"/g)).toHaveLength(1);
  });
});
