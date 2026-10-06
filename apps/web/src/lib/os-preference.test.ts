import { describe, expect, it, vi } from "vitest";

import {
  detectOs,
  getViewOsState,
  resolvePreferredOs,
  setViewOs,
  subscribeViewOs,
  viewOsFor,
} from "./os-preference";

const UA = {
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
};

describe("detectOs", () => {
  it("UA-CH の platform を優先する", () => {
    expect(detectOs({ userAgentData: { platform: "Windows" }, userAgent: UA.mac })).toBe("windows");
    expect(detectOs({ userAgentData: { platform: "macOS" } })).toBe("macos");
    expect(detectOs({ userAgentData: { platform: "Linux" }, userAgent: UA.windows })).toBeNull();
    expect(detectOs({ userAgentData: { platform: "Chrome OS" } })).toBeNull();
  });

  it("UA-CH が無いブラウザー (Safari・Firefox) は userAgent から推定する", () => {
    expect(detectOs({ userAgent: UA.windows })).toBe("windows");
    expect(detectOs({ userAgent: UA.mac, maxTouchPoints: 0 })).toBe("macos");
  });

  it("スマートフォン・iPad・Linux は推定しない", () => {
    expect(detectOs({ userAgent: UA.iphone })).toBeNull();
    expect(detectOs({ userAgent: UA.android })).toBeNull();
    expect(detectOs({ userAgent: UA.linux })).toBeNull();
    // iPadOS の Safari は Macintosh を名乗る
    expect(detectOs({ userAgent: UA.mac, maxTouchPoints: 5 })).toBeNull();
    expect(detectOs(undefined)).toBeNull();
  });
});

describe("resolvePreferredOs", () => {
  it("プロフィールの設定 > 端末の推定 > Windows の順", () => {
    expect(resolvePreferredOs("macos", "windows")).toEqual({ os: "macos", source: "profile" });
    expect(resolvePreferredOs(null, "macos")).toEqual({ os: "macos", source: "device" });
    expect(resolvePreferredOs(undefined, null)).toEqual({ os: "windows", source: "default" });
  });
});

describe("タブで選んだ OS", () => {
  it("変わったときだけ購読者に知らせる", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeViewOs(listener);
    setViewOs("learner", "macos");
    setViewOs("learner", "macos");
    expect(viewOsFor(getViewOsState(), "learner")).toBe("macos");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setViewOs("learner", null);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getViewOsState()).toBeNull();
  });

  it("選んだ本人の画面でだけ使い、ログアウト後の別アカウントには持ち越さない", () => {
    setViewOs("learner", "macos");
    const state = getViewOsState();
    expect(viewOsFor(state, "learner")).toBe("macos");
    // 同じ SPA で別の受講者がログインしても、前の人の選択では設定を上書きしない
    expect(viewOsFor(state, "next-learner")).toBeNull();
    expect(resolvePreferredOs("windows", "macos").os).toBe("windows");
    // 未ログイン (デモ) の選択とログイン後も混ぜない
    expect(viewOsFor(state, null)).toBeNull();
    setViewOs(null, "windows");
    expect(viewOsFor(getViewOsState(), "learner")).toBeNull();
    expect(viewOsFor(getViewOsState(), null)).toBe("windows");
    // 持ち主が変わったら同じ OS でも知らせる
    const listener = vi.fn();
    const unsubscribe = subscribeViewOs(listener);
    setViewOs("learner", "windows");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setViewOs("learner", null);
  });
});
