import { describe, expect, it } from "vitest";

import {
  AUDIT_ACTION_FILTER_LABELS,
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  type AuditAction,
} from "./audit-actions.js";

describe("audit-actions", () => {
  it("既知の action は日本語ラベルを返す", () => {
    expect(auditActionLabel("user_role_change")).toBe("ロール変更");
    expect(auditActionLabel("stage_publish")).toBe("ステージ公開");
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

  it("完了条件の主要操作 (ログイン / ステージ公開・削除 / 受講登録 / 修了証) を網羅する", () => {
    // Issue #64 の完了条件。 記録側 (apps/api) は `AuditAction` 型で縛られるため、
    // ここを満たしていれば「ラベルだけあって記録されない」状態は起きない。
    // 受講登録の入口は Phase 3b で自己開始 (`stage_self_start`) に一本化された。
    const required: AuditAction[] = [
      "login",
      "stage_publish",
      "stage_delete",
      "stage_self_start",
      "certificate_issue",
    ];
    for (const action of required) {
      expect(AUDIT_ACTION_LABELS[action]).toBeTruthy();
    }
  });

  it("退役した割当の action は記録できないが、過去ログの絞り込みには残る", () => {
    for (const action of [
      "enrollment_create",
      "enrollment_bulk_create",
      "enrollment_bulk_delete",
      "enrollment_preset_apply",
    ]) {
      // 記録側の型 (= `AUDIT_ACTION_LABELS` のキー) には無い。
      expect(Object.keys(AUDIT_ACTION_LABELS)).not.toContain(action);
      // それでもラベルは引けて、フィルタの選択肢にも並ぶ。
      expect(AUDIT_ACTION_FILTER_LABELS[action]).toBeTruthy();
      expect(auditActionLabel(action)).toContain("(旧)");
    }
  });
});
