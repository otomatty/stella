import { describe, expect, it } from "vitest";

import { iconFetchKey } from "./icon-fetch-key";

describe("iconFetchKey", () => {
  it("has_icon の id 集合が同じならノードの並びが変わっても同じキー", () => {
    const a = iconFetchKey("seed-learner", [
      { id: "id-b", has_icon: true },
      { id: "id-a", has_icon: true },
      { id: "id-fog" },
    ]);
    const b = iconFetchKey("seed-learner", [
      { id: "id-a", has_icon: true },
      { id: "id-fog" },
      { id: "id-b", has_icon: true },
    ]);
    expect(a).toBe(b);
  });

  it("霧だった星に has_icon が付いたらキーが変わる (一括取得をやり直す合図)", () => {
    const before = iconFetchKey("seed-learner", [{ id: "id-a", has_icon: true }, { id: "id-d" }]);
    const after = iconFetchKey("seed-learner", [
      { id: "id-a", has_icon: true },
      { id: "id-d", has_icon: true },
    ]);
    expect(before).not.toBe(after);
  });

  it("受講者が変わったらキーが変わる (前の人の blob を持ち越さない)", () => {
    const nodes = [{ id: "id-a", has_icon: true as const }];
    expect(iconFetchKey("seed-learner", nodes)).not.toBe(iconFetchKey("seed-learner2", nodes));
  });
});
