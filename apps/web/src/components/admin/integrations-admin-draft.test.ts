import { describe, expect, it } from "vitest";
import type { IntegrationScope } from "@stella/shared/integrations/types";
import { syncIntegrationClientDraft } from "./integrations-admin-draft";

const saved = {
  allowedStagePrefixes: ["devlab-"],
  scopes: ["groups:write", "progress:read"] as IntegrationScope[],
};
function edited() {
  return {
    ...syncIntegrationClientDraft(null, saved),
    prefixes: "edited-, draft-",
    scopes: ["events:read"] as IntegrationScope[],
  };
}
describe("連携クライアントの編集中の入力", () => {
  it("別クライアントの保存で同じ内容の配列を再取得しても、接頭辞と範囲の編集を保つ", () => {
    const draft = edited();
    expect(
      syncIntegrationClientDraft(draft, {
        allowedStagePrefixes: [...saved.allowedStagePrefixes],
        scopes: [...saved.scopes],
      }),
    ).toBe(draft);
  });
  it("保存された範囲の順序だけ変わっても、編集を保つ", () => {
    const draft = edited();
    expect(
      syncIntegrationClientDraft(draft, { ...saved, scopes: [...saved.scopes].reverse() }),
    ).toBe(draft);
  });
  it("接頭辞の保存値が変わったら接頭辞だけ合わせ、範囲の編集を保つ", () => {
    const next = syncIntegrationClientDraft(edited(), {
      ...saved,
      allowedStagePrefixes: ["sample-", "extra-"],
    });
    expect(next.prefixes).toBe("sample-, extra-");
    expect(next.scopes).toEqual(["events:read"]);
  });
  it("範囲の保存値が変わったら範囲だけ合わせ、接頭辞の編集を保つ", () => {
    const next = syncIntegrationClientDraft(edited(), { ...saved, scopes: ["members:write"] });
    expect(next.scopes).toEqual(["members:write"]);
    expect(next.prefixes).toBe("edited-, draft-");
  });
  it("保存された値を空にしても同期し、その後の同じ値の再取得では新しい編集を保つ", () => {
    const empty = { allowedStagePrefixes: [], scopes: [] };
    const reset = syncIntegrationClientDraft(edited(), empty);
    expect(reset).toMatchObject({ prefixes: "", scopes: [] });
    const draft = { ...reset, prefixes: "new-", scopes: ["events:read"] as IntegrationScope[] };
    expect(syncIntegrationClientDraft(draft, { allowedStagePrefixes: [], scopes: [] })).toBe(draft);
  });
});
