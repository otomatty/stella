/**
 * 版番号つきの読み出し管理。
 *
 * ここが壊れると、重なった読み出しで古い結果が画面に残る (`isCurrent`) か、
 * 追い越された呼び出しが空を返して「開始したのにレッスンが開かない」になる
 * (`joinLatest`)。
 */

import { describe, expect, it } from "vitest";

import { createLatestRequest } from "./latest-request";

describe("createLatestRequest", () => {
  it("最後に始めた版だけが最新", () => {
    const req = createLatestRequest<number[]>();
    const first = req.begin();
    const second = req.begin();
    expect(req.isCurrent(first)).toBe(false);
    expect(req.isCurrent(second)).toBe(true);
  });

  it("追い越された呼び出しは新しい読み出しの結果を返す", async () => {
    const req = createLatestRequest<number[]>();
    const first = req.begin();
    req.track(first, Promise.resolve([1]));
    const second = req.begin();
    req.track(second, Promise.resolve([2]));

    await expect(req.joinLatest(first, [])).resolves.toEqual([2]);
  });

  it("さらに追い越されても最後の結果に収束する", async () => {
    const req = createLatestRequest<number[]>();
    const first = req.begin();
    const second = req.begin();
    // 2 番目は「3 番目に相乗りする」形で解決する (実際の load と同じ繋ぎ方)。
    const third = req.begin();
    req.track(third, Promise.resolve([3]));
    const secondPromise = req.joinLatest(second, []);
    req.track(second, secondPromise);

    await expect(req.joinLatest(first, [])).resolves.toEqual([3]);
  });

  it("新しい読み出しが登録されていなければ fallback", async () => {
    const req = createLatestRequest<number[]>();
    const only = req.begin();
    req.track(only, Promise.resolve([1]));
    // 自分自身に相乗りすると解決しないので、最新が自分なら fallback を返す。
    await expect(req.joinLatest(only, [])).resolves.toEqual([]);
  });
});
