import type { LearnerAiFeedback, LearnerRubricItem } from "@stella/shared/review/ai-review";
import { describe, expect, it } from "vitest";
import { buildAiFeedbackView } from "./ai-feedback-view";

const guide = {
  title: "比べた結果をそのまま返す",
  problem: "条件分岐で真偽値を選び直しています。",
  why: "比較式はそのまま真偽値になります。",
  example: {
    context: "荷物の重さ",
    ng: "if (weight <= 10) return true;",
    ok: "return weight <= 10;",
  },
};
const required: LearnerRubricItem = {
  id: "return",
  label: guide.title,
  criterion: "比較式の真偽値を直接返す",
  required: true,
  result: "unmet",
  guide,
};
const met: LearnerRubricItem = {
  ...required,
  id: "boundary",
  label: "境界の値を扱う",
  result: "met",
};
const optional: LearnerRubricItem = {
  ...required,
  id: "names",
  label: "名前をそろえる",
  required: false,
};
const undetermined: LearnerRubricItem = {
  ...required,
  id: "format",
  label: "整形する",
  result: "undetermined",
};

function feedback(overrides: Partial<LearnerAiFeedback> = {}): LearnerAiFeedback {
  return {
    verdict: "resubmit",
    rubric: [met, required, optional, undetermined],
    message: "返信",
    nextSteps: ["次の手順"],
    goodPoints: ["境界の値を正しく扱えています。"],
    findings: [],
    ...overrides,
  };
}

describe("buildAiFeedbackView", () => {
  it("必須の修正が1点なら教材の問題・理由・例を出す", () => {
    const view = buildAiFeedbackView(feedback(), "pass");
    expect(view).toMatchObject({
      resubmit: true,
      conclusion: "テストは通っています。必須の項目を 1 点直すと合格です。",
      writingSummary: "3 項目のうち 1 項目を直す",
      fixes: [
        {
          id: required.id,
          title: required.label,
          problem: guide.problem,
          why: guide.why,
          example: guide.example,
        },
      ],
      message: "",
      goodPoints: ["境界の値を正しく扱えています。"],
    });
    expect(view).not.toHaveProperty("nextSteps");
  });

  it("必須の修正が2点なら2点と数え、ガイドのない項目には criterion と案内を出す", () => {
    const withoutGuide: LearnerRubricItem = {
      ...required,
      id: "second",
      label: "表示名",
      criterion: "式を一度だけ評価する",
      guide: null,
    };
    const view = buildAiFeedbackView(
      feedback({ rubric: [required, withoutGuide, met] }),
      "resubmit",
    );
    expect(view).toMatchObject({
      conclusion: "テストは通っています。必須の項目を 2 点直すと合格です。",
      writingSummary: "3 項目のうち 2 項目を直す",
    });
    expect(view?.fixes).toHaveLength(2);
    expect(view?.fixes[1]).toEqual({
      id: "second",
      title: "式を一度だけ評価する",
      problem: "この項目を満たすように直してください。",
      why: undefined,
      example: undefined,
    });
    expect(view?.checklist[1]?.label).toBe("表示名");
  });

  it("必須の未達がない再提出では結論に件数を出さない", () => {
    const view = buildAiFeedbackView(feedback({ rubric: [met, optional] }), "resubmit");
    expect(view?.conclusion).toBe("テストは通っています。必須の項目を直すと合格です。");
  });

  it("合格では返信を表示し、修正カードを出さない", () => {
    const view = buildAiFeedbackView(
      feedback({ verdict: "pass", rubric: [met, optional] }),
      "pass",
    );
    expect(view).toMatchObject({
      resubmit: false,
      conclusion: "合格です。",
      writingSummary: "すべて満たしています",
      fixes: [],
      message: "返信",
      optionalItems: [{ id: optional.id, label: optional.label }],
    });
  });

  it("合格では次に試すことを表示データに残す", () => {
    const view = buildAiFeedbackView(feedback({ verdict: "pass", rubric: [met] }), "pass");
    expect(view?.nextSteps).toEqual(["次の手順"]);
  });

  it("合格では major の本文を見直したいところに出す", () => {
    const location = { file: "src/checks.js", startLine: 12, endLine: 14 };
    const view = buildAiFeedbackView(
      feedback({
        verdict: "pass",
        rubric: [met],
        findings: [
          { ...location, severity: "major", comment: "重大な所見" },
          { ...location, severity: "minor", comment: "軽い所見" },
          { ...location, severity: "info", comment: "参考の所見" },
        ],
      }),
      "pass",
    );
    expect(view?.importantComments).toEqual(["重大な所見"]);
    expect(view?.optionalComments).toEqual(["軽い所見", "参考の所見"]);
    expect(JSON.stringify(view)).not.toContain(location.file);
  });

  it("任意の未達と必須の未達を区別し、判断できない項目は一覧に出さない", () => {
    const view = buildAiFeedbackView(feedback(), "resubmit");
    expect(view?.checklist).toEqual([
      { id: met.id, label: met.label, status: "met", statusLabel: "できています" },
      { id: required.id, label: required.label, status: "required-fix", statusLabel: "直すところ" },
      {
        id: optional.id,
        label: optional.label,
        status: "optional-fix",
        statusLabel: "合否には関係しません",
      },
    ]);
    expect(view?.optionalItems).toEqual([{ id: optional.id, label: optional.label }]);
  });

  it("所見は minor と info の本文だけを任意の修正に出す", () => {
    const location = { file: "src/checks.js", startLine: 12, endLine: 14 };
    const view = buildAiFeedbackView(
      feedback({
        findings: [
          { ...location, severity: "major", comment: "重大な所見" },
          { ...location, severity: "minor", comment: "軽い所見" },
          { ...location, severity: "info", comment: "参考の所見" },
        ],
      }),
      "resubmit",
    );
    expect(view?.optionalComments).toEqual(["軽い所見", "参考の所見"]);
    expect(view).not.toHaveProperty("importantComments");
    expect(JSON.stringify(view)).not.toContain(location.file);
  });

  it("返信の判定が無ければ提出の判定を使う", () => {
    const view = buildAiFeedbackView(feedback({ verdict: undefined, rubric: [met] }), "pass");
    expect(view?.conclusion).toBe("合格です。");
  });

  it.each([{ notes: ["本文だけの補足"] }, { notes: [] }])(
    "補足があれば所見より優先する (%j)",
    ({ notes }) => {
      const view = buildAiFeedbackView(
        feedback({
          notes,
          findings: [
            { file: "index.html", startLine: 1, endLine: 2, severity: "info", comment: "古い所見" },
          ],
        }),
        "resubmit",
      );
      expect(view?.optionalComments).toEqual(notes);
    },
  );

  it("評価項目のない古い合格記録は従来の表示に戻す", () => {
    expect(
      buildAiFeedbackView(feedback({ verdict: undefined, rubric: undefined }), "pass"),
    ).toBeNull();
  });
});
