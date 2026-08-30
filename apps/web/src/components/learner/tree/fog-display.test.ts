import { describe, expect, it } from "vitest";

import { revealsDevMap } from "@/lib/dev-mode";

import { fogObscured, showsStar } from "./fog-display";

describe("fogObscured", () => {
  it("霧の星の名前はぼかす", () => {
    expect(fogObscured("fog", false)).toBe(true);
  });

  it("霧より先の段もぼかす側に倒す (段が増えてもぼかし忘れが出ない)", () => {
    expect(fogObscured("edge", false)).toBe(true);
    expect(fogObscured("hidden", false)).toBe(true);
  });

  it("開発者モードではどの段もぼかさない", () => {
    expect(fogObscured("fog", true)).toBe(false);
    expect(fogObscured("edge", true)).toBe(false);
  });

  it("名前まで見えている段 (full) はぼかさない", () => {
    expect(fogObscured("full", false)).toBe(false);
    expect(fogObscured("full", true)).toBe(false);
  });
});

describe("showsStar", () => {
  it("星として描くのは full と fog だけ", () => {
    expect(showsStar("full", false)).toBe(true);
    expect(showsStar("fog", false)).toBe(true);
  });

  it("3 歩先 (edge) は幽霊ノード — 星は描かず線の終点にしかならない", () => {
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
    expect(fogObscured("fog", revealDev)).toBe(true);
  });

  it("FAB をオンにしても、サーバが dev_mode を返さなければぼかしたまま", () => {
    expect(fogObscured("fog", revealsDevMap(true, undefined))).toBe(true);
    expect(fogObscured("fog", revealsDevMap(true, false))).toBe(true);
  });

  it("サーバが dev_mode を返し、かつ FAB がオンのときだけ外れる", () => {
    expect(fogObscured("fog", revealsDevMap(true, true))).toBe(false);
    // サーバがオンでもローカルがオフなら外さない (FAB で明示的に入れる)。
    expect(fogObscured("fog", revealsDevMap(false, true))).toBe(true);
  });
});
