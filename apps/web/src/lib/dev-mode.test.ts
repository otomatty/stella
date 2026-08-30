import { describe, expect, it } from "vitest";

import {
  DEV_MODE_HEADER,
  DEV_MODE_STORAGE_KEY,
  devModeHeaderValue,
  parseDevModeStored,
} from "./dev-mode";

describe("開発者モードの保存値", () => {
  it("未保存はオン (DEV_MODE 付きのローカルはこれまで常時表示だった互換)", () => {
    expect(parseDevModeStored(null)).toBe(true);
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
