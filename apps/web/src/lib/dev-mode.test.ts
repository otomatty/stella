import { describe, expect, it } from "vitest";

import {
  DEV_MODE_HEADER,
  DEV_MODE_STORAGE_KEY,
  devModeHeaderValue,
  parseDevModeStored,
  revealsDevMap,
} from "./dev-mode";

describe("開発者モードの保存値", () => {
  it("未保存はオフ (本番の新規セッションで霧が外れないように — Issue #271)", () => {
    expect(parseDevModeStored(null)).toBe(false);
  });

  it("'0' / 'false' だけをオフとみなす", () => {
    expect(parseDevModeStored("0")).toBe(false);
    expect(parseDevModeStored("false")).toBe(false);
    expect(parseDevModeStored("1")).toBe(true);
    expect(parseDevModeStored("true")).toBe(true);
  });

  it("API へ付けるヘッダは 0/1 で、名前は X-Falcon-Dev-Mode", () => {
    expect(DEV_MODE_HEADER).toBe("X-Falcon-Dev-Mode");
    expect(devModeHeaderValue(true)).toBe("1");
    expect(devModeHeaderValue(false)).toBe("0");
  });

  it("保存キーは falcon_dev_mode_v1", () => {
    expect(DEV_MODE_STORAGE_KEY).toBe("falcon_dev_mode_v1");
  });
});

describe("revealsDevMap — ローカルの設定 AND サーバの確認", () => {
  it("両方そろったときだけ真", () => {
    expect(revealsDevMap(true, true)).toBe(true);
  });

  it("サーバが開発モードでなければ、FAB がオンでも偽 (Issue #271)", () => {
    expect(revealsDevMap(true, false)).toBe(false);
    // 応答が来る前 (undefined) も伏せる側に倒す。
    expect(revealsDevMap(true, undefined)).toBe(false);
  });

  it("ローカルがオフならサーバがオンでも偽", () => {
    expect(revealsDevMap(false, true)).toBe(false);
  });
});
