import { describe, expect, it } from "vitest";
import { themeTransitionRadius } from "./useTheme";

describe("themeTransitionRadius", () => {
  it("画面中央から四隅までの距離を返す", () => {
    expect(themeTransitionRadius({ x: 300, y: 400 }, 600, 800)).toBe(500);
  });

  it("中心が偏っていても最も遠い右下の隅まで届く", () => {
    expect(themeTransitionRadius({ x: 100, y: 100 }, 400, 500)).toBe(500);
  });

  it("右上の隅から左下の隅まで届く", () => {
    expect(themeTransitionRadius({ x: 300, y: 0 }, 300, 400)).toBe(500);
  });

  it("画面の外に起点があっても最も遠い隅まで届く", () => {
    expect(themeTransitionRadius({ x: 500, y: -100 }, 300, 200)).toBe(Math.hypot(500, 300));
  });
});
