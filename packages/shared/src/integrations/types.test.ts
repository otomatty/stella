import { describe, expect, it } from "vitest";
import { INTEGRATION_SCOPES, INTEGRATION_SCOPE_DESCRIPTIONS } from "./types.js";

describe("連携の操作の説明", () => {
  it("すべての scope に空でない日本語の説明があり、定義外の scope を含まない", () => {
    expect(Object.keys(INTEGRATION_SCOPE_DESCRIPTIONS).sort()).toEqual(
      [...INTEGRATION_SCOPES].sort(),
    );
    for (const scope of INTEGRATION_SCOPES) {
      const description = INTEGRATION_SCOPE_DESCRIPTIONS[scope];
      expect(description.trim(), scope).not.toBe("");
      expect(description, scope).toMatch(/[ぁ-んァ-ヶ一-龠]/u);
    }
  });
});
