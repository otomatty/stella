import { describe, expect, it } from "vitest";

import { shouldDismissDrawer } from "./drawer";

describe("shouldDismissDrawer", () => {
  it("閾値を超えて引き下げたら閉じる", () => {
    expect(shouldDismissDrawer(97, 2000)).toBe(true);
  });

  it("ゆっくり少しだけ引いたら閉じない (戻る)", () => {
    expect(shouldDismissDrawer(40, 2000)).toBe(false);
  });

  it("距離が足りなくても速く弾いたら閉じる", () => {
    // 40px / 50ms = 0.8px/ms > 0.5px/ms
    expect(shouldDismissDrawer(40, 50)).toBe(true);
  });

  it("逆向き (ゴムで引っぱった状態) では閉じない", () => {
    expect(shouldDismissDrawer(-120, 50)).toBe(false);
  });

  it("動いていなければ閉じない — elapsed 0 でもゼロ除算しない", () => {
    expect(shouldDismissDrawer(0, 0)).toBe(false);
  });
});
