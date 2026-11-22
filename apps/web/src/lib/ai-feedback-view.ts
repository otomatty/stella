import type { LearnerAiFeedback, LearnerRubricItem } from "@stella/shared/review/ai-review";
import type { Submission } from "@stella/shared/review/types";

type ChecklistStatus = "met" | "required-fix" | "optional-fix";

const checklistLabels: Record<ChecklistStatus, string> = {
  met: "できています",
  "required-fix": "直すところ",
  "optional-fix": "合否には関係しません",
};

export function buildAiFeedbackView(
  feedback: LearnerAiFeedback,
  submissionVerdict: Submission["verdict"],
) {
  const verdict = feedback.verdict ?? submissionVerdict;
  if (!feedback.rubric || (verdict !== "pass" && verdict !== "resubmit")) return null;

  const checklist = [];
  const fixes = [];
  const optionalItems: Pick<LearnerRubricItem, "id" | "label">[] = [];
  for (const { id, label, criterion, result, required, guide } of feedback.rubric) {
    if (result === "undetermined") continue;

    const status: ChecklistStatus =
      result === "met" ? "met" : required ? "required-fix" : "optional-fix";
    checklist.push({ id, label, status, statusLabel: checklistLabels[status] });

    if (status === "required-fix" && verdict === "resubmit") {
      fixes.push({
        id,
        title: guide ? label : criterion,
        problem: guide?.problem ?? "この項目を満たすように直してください。",
        why: guide?.why,
        example: guide?.example,
      });
    }
    if (status === "optional-fix") optionalItems.push({ id, label });
  }

  const optionalComments = feedback.findings
    .filter(({ severity }) => severity === "minor" || severity === "info")
    .map(({ comment }) => comment);

  const resubmit = verdict === "resubmit";
  const fixCount = fixes.length;
  const conclusion = resubmit
    ? `動きは合っています。書き方を${fixCount ? ` ${fixCount} 点` : ""}直すと合格です。`
    : "合格です。";
  const writingSummary = resubmit
    ? `${checklist.length} 項目のうち ${fixCount} 項目を直す`
    : "すべて満たしています";

  return {
    resubmit,
    conclusion,
    writingSummary,
    checklist,
    fixes,
    optionalItems,
    optionalComments: [...new Set(optionalComments)],
    message: resubmit ? "" : feedback.message,
    goodPoints: [...new Set(feedback.goodPoints)],
  };
}

export type AiFeedbackView = NonNullable<ReturnType<typeof buildAiFeedbackView>>;
