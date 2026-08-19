import { describe, expect, it } from "vitest";
import { parseSidebarOpen } from "./sidebar-storage";

describe("parseSidebarOpen", () => {
  it("保存済みの値を真偽値に戻す", () => {
    expect(parseSidebarOpen("1", false)).toBe(true);
    expect(parseSidebarOpen("0", true)).toBe(false);
  });

  it("未保存なら既定値を使う", () => {
    expect(parseSidebarOpen(null, true)).toBe(true);
    expect(parseSidebarOpen(null, false)).toBe(false);
  });

  it("想定外の値は既定値へ倒す", () => {
    expect(parseSidebarOpen("true", false)).toBe(false);
    expect(parseSidebarOpen("", true)).toBe(true);
  });
});
