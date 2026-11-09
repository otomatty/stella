import { describe, expect, it } from "vitest";

import { revealsDevMap } from "@/lib/dev-mode";

import { nameObscured, showsStar } from "./fog-display";

describe("nameObscured", () => {
  it("full でもロックの星はぼかし、開発者表示では外す", () => {
    expect(nameObscured({ visibility: "full", state: "locked" }, false)).toBe(true);
    expect(nameObscured({ visibility: "full", state: "locked" }, true)).toBe(false);
    for (const state of ["cleared", "active", "unlocked"] as const) {
      expect(nameObscured({ visibility: "full", state }, false)).toBe(false);
    }
  });
  it("霧の星の名前はぼかす", () => {
    expect(nameObscured({ visibility: "fog", state: "unlocked" }, false)).toBe(true);
  });

  it("霧より先の段もぼかす側に倒す (段が増えてもぼかし忘れが出ない)", () => {
    expect(nameObscured({ visibility: "edge", state: "unlocked" }, false)).toBe(true);
    expect(nameObscured({ visibility: "hidden", state: "unlocked" }, false)).toBe(true);
  });

  it("開発者モードではどの段もぼかさない", () => {
    expect(nameObscured({ visibility: "fog", state: "unlocked" }, true)).toBe(false);
    expect(nameObscured({ visibility: "edge", state: "unlocked" }, true)).toBe(false);
  });

  it("名前まで見えている段 (full) はぼかさない", () => {
    expect(nameObscured({ visibility: "full", state: "unlocked" }, false)).toBe(false);
    expect(nameObscured({ visibility: "full", state: "unlocked" }, true)).toBe(false);
  });
});

describe("showsStar", () => {
  it("星として描くのは full と fog だけ", () => {
    expect(showsStar("full", false)).toBe(true);
    expect(showsStar("fog", false)).toBe(true);
  });

  it("2 歩先 (edge) は幽霊ノード — 星は描かず線の終点にしかならない", () => {
    expect(showsStar("edge", false)).toBe(false);
  });

  it("開発者モードでは幽霊ノードも普通の星として描く", () => {
    expect(showsStar("edge", true)).toBe(true);
    expect(showsStar("hidden", true)).toBe(true);
  });
});

/**
 * Issue #271 の回帰。`DEV_MODE` の無いサーバ (= 本番) では、localStorage が未設定でも
 * FAB でオンにされていても、霧の星は必ずぼかす。
 */
describe("本番 (サーバの dev_mode なし) では霧が外れない", () => {
  it("localStorage 未設定 (= 既定のオフ) なら霧はぼかしたまま", () => {
    const revealDev = revealsDevMap(false, undefined);
    expect(revealDev).toBe(false);
    expect(nameObscured({ visibility: "fog", state: "unlocked" }, revealDev)).toBe(true);
  });

  it("FAB をオンにしても、サーバが dev_mode を返さなければぼかしたまま", () => {
    expect(
      nameObscured({ visibility: "fog", state: "unlocked" }, revealsDevMap(true, undefined)),
    ).toBe(true);
    expect(nameObscured({ visibility: "fog", state: "unlocked" }, revealsDevMap(true, false))).toBe(
      true,
    );
  });

  it("サーバが dev_mode を返し、かつ FAB がオンのときだけ外れる", () => {
    expect(nameObscured({ visibility: "fog", state: "unlocked" }, revealsDevMap(true, true))).toBe(
      false,
    );
    // サーバがオンでもローカルがオフなら外さない (FAB で明示的に入れる)。
    expect(nameObscured({ visibility: "fog", state: "unlocked" }, revealsDevMap(false, true))).toBe(
      true,
    );
  });
});
