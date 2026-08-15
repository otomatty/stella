import { describe, expect, it } from "vitest";

import { AUDIT_ACTION_LABELS, auditActionLabel, type AuditAction } from "./audit-actions.js";

describe("audit-actions", () => {
  it("既知の action は日本語ラベルを返す", () => {
    expect(auditActionLabel("user_role_change")).toBe("ロール変更");
    expect(auditActionLabel("course_publish")).toBe("コース公開");
    expect(auditActionLabel("certificate_issue")).toBe("修了証発行");
  });

  it("未知の action は素のまま返す", () => {
    expect(auditActionLabel("something_new")).toBe("something_new");
  });

  it("すべての action にラベルがある (フィルタ選択肢がそのまま表示に使われる)", () => {
    for (const [action, label] of Object.entries(AUDIT_ACTION_LABELS)) {
      expect(label, action).not.toBe("");
      expect(auditActionLabel(action)).toBe(label);
    }
  });

  it("完了条件の主要操作 (ログイン / コース公開・削除 / 受講登録 / 修了証) を網羅する", () => {
    // Issue #64 の完了条件。 記録側 (apps/api) は `AuditAction` 型で縛られるため、
    // ここを満たしていれば「ラベルだけあって記録されない」状態は起きない。
    const required: AuditAction[] = [
      "login",
      "course_publish",
      "course_delete",
      "enrollment_create",
      "certificate_issue",
    ];
    for (const action of required) {
      expect(AUDIT_ACTION_LABELS[action]).toBeTruthy();
    }
  });
});
