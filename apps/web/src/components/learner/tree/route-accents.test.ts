import { describe, expect, it } from "vitest";

import { ROUTE_ACCENTS, ROUTE_SOLIDS, routeSolidOf } from "./route-accents";

describe("ROUTE_SOLIDS", () => {
  it("ROUTE_ACCENTS と同じキーを持つ", () => {
    expect([...ROUTE_SOLIDS.keys()].sort()).toEqual([...ROUTE_ACCENTS.keys()].sort());
  });

  it("すべての色が 0〜255 の整数 3 つの RGB 形式である", () => {
    for (const value of ROUTE_SOLIDS.values()) {
      expect(value).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      for (const channel of value.split(" ").map(Number)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("扇の塗り色を返し、基礎には色を設定しない", () => {
    expect(routeSolidOf("フロントエンド")).toBe("2 132 199");
    expect(routeSolidOf("基礎")).toBeUndefined();
  });
});
