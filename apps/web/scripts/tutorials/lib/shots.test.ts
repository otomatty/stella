import { describe, expect, it } from "vitest";
import { defineShots, pixelRegion, validateShot } from "./shots";
const viewport = { width: 1280, height: 800 };
describe("静止画の定義", () => {
  it("定義とショットの id・セレクタを検査する", () => {
    expect(
      defineShots({
        id: "lesson",
        async run() {
          /* 定義の検査だけを行う */
        },
      }).id,
    ).toBe("lesson");
    expect(() =>
      defineShots({
        id: "../lesson",
        async run() {
          /* 定義の検査だけを行う */
        },
      }),
    ).toThrow();
    expect(() =>
      defineShots({
        id: "lesson",
        user: "",
        async run() {
          /* 定義の検査だけを行う */
        },
      }),
    ).toThrow();
    expect(() => validateShot("../escape", { regions: {} })).toThrow();
    expect(() => validateShot("web/task", { regions: { doc: "" } })).toThrow();
    expect(() =>
      validateShot("web/task", { regions: { doc: "#doc" }, clipRegions: ["unknown"] }),
    ).toThrow();
    expect(() =>
      validateShot("web/task", { regions: { doc: "#doc" }, clipRegions: ["doc"] }),
    ).not.toThrow();
  });
});
describe("領域を画像ピクセルにする", () => {
  it("倍率と小数座標を反映して外側に丸める", () => {
    expect(pixelRegion({ x: 10.25, y: 20.75, width: 30.5, height: 40.5 }, viewport, 2)).toEqual([
      20, 41, 62, 82,
    ]);
  });
  it("画面と一致する領域を受け付ける", () => {
    expect(pixelRegion({ x: 0, y: 0, ...viewport }, viewport, 2)).toEqual([0, 0, 2560, 1600]);
  });
  it("既定では一部でも画面外なら拒否する", () => {
    expect(() => pixelRegion({ x: 100, y: -10, width: 500, height: 1200 }, viewport, 2)).toThrow(
      /画面の外/,
    );
  });
  it("指定された本文を可視範囲に切り詰める", () => {
    expect(pixelRegion({ x: 100, y: -10, width: 500, height: 1200 }, viewport, 2, true)).toEqual([
      200, 0, 1000, 1600,
    ]);
    expect(pixelRegion({ x: -10, y: 700, width: 1400, height: 200 }, viewport, 2, true)).toEqual([
      0, 1400, 2560, 200,
    ]);
  });
  it("完全に画面外なら切り詰め指定でも拒否する", () => {
    expect(() =>
      pixelRegion({ x: 1280, y: 10, width: 10, height: 10 }, viewport, 2, true),
    ).toThrow();
  });
  it.each([0, -1, NaN, Infinity])("不正な幅を拒否: %j", (width) => {
    expect(() => pixelRegion({ x: 0, y: 0, width, height: 10 }, viewport, 2)).toThrow();
  });
});
