import { describe, expect, it } from "vitest";

import { isHandheld, linkShareMethod } from "./device";

const UA = {
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
};

describe("isHandheld", () => {
  it("スマートフォンとタブレットの UA は true", () => {
    expect(isHandheld({ userAgent: UA.iphone })).toBe(true);
    expect(isHandheld({ userAgent: UA.android })).toBe(true);
    expect(isHandheld({ userAgent: UA.androidTablet })).toBe(true);
  });

  it("Macintosh を名乗る iPadOS の Safari はタッチ点の数で見分ける", () => {
    expect(isHandheld({ userAgent: UA.mac, maxTouchPoints: 5 })).toBe(true);
    expect(isHandheld({ userAgent: UA.mac, maxTouchPoints: 0 })).toBe(false);
  });

  it("パソコンの UA は false (タッチ操作のできる Windows も含む)", () => {
    expect(isHandheld({ userAgent: UA.windows })).toBe(false);
    expect(isHandheld({ userAgent: UA.windows, maxTouchPoints: 10 })).toBe(false);
    expect(isHandheld({ userAgent: UA.linux })).toBe(false);
  });

  it("UA-CH の mobile を優先する", () => {
    expect(isHandheld({ userAgentData: { mobile: true }, userAgent: UA.linux })).toBe(true);
    expect(isHandheld({ userAgentData: { mobile: false }, userAgent: UA.windows })).toBe(false);
  });

  it("navigator が無ければ false", () => {
    expect(isHandheld(undefined)).toBe(false);
  });
});

describe("linkShareMethod", () => {
  it("共有シートがあれば share、無ければ copy", () => {
    expect(linkShareMethod({ share: () => Promise.resolve() })).toBe("share");
    expect(linkShareMethod({})).toBe("copy");
    expect(linkShareMethod(undefined)).toBe("copy");
  });
});
