import { describe, expect, expectTypeOf, test } from "vitest";
import { dedupe } from "../src/e02-dedupe";

// 呼ばれた key を記録する。failOnce の key は1回目だけ失敗する
const createFetch = (failOnce: number[] = []) => {
  const calls: number[] = [];
  const fn = async (id: number) => {
    calls.push(id);
    await Promise.resolve();
    if (failOnce.includes(id) && calls.filter((c) => c === id).length === 1) {
      throw new Error(`${id} の取得に失敗`);
    }
    return `ユーザー${id}`;
  };
  return { calls, fn };
};

describe("dedupe", () => {
  test("結果を返す", async () => {
    const { fn } = createFetch();
    const get = dedupe(fn);
    await expect(get(1)).resolves.toBe("ユーザー1");
  });

  test("同時の呼び出しは1回にまとめる", async () => {
    const { calls, fn } = createFetch();
    const get = dedupe(fn);
    const results = await Promise.all([get(1), get(1), get(2), get(1)]);
    expect(results).toEqual(["ユーザー1", "ユーザー1", "ユーザー2", "ユーザー1"]);
    expect(calls).toEqual([1, 2]);
  });

  test("成功した結果は覚えておく", async () => {
    const { calls, fn } = createFetch();
    const get = dedupe(fn);
    await get(1);
    await get(1);
    expect(calls).toEqual([1]);
  });

  test("失敗は覚えない", async () => {
    const { calls, fn } = createFetch([1]);
    const get = dedupe(fn);
    await expect(get(1)).rejects.toThrow("1 の取得に失敗");
    await expect(get(1)).resolves.toBe("ユーザー1");
    expect(calls).toEqual([1, 1]);
  });

  test("同時に呼んで失敗したときは、どちらにも同じ失敗が届く", async () => {
    const { calls, fn } = createFetch([1]);
    const get = dedupe(fn);
    const [a, b] = await Promise.allSettled([get(1), get(1)]);
    expect(a.status).toBe("rejected");
    expect(b.status).toBe("rejected");
    expect(calls).toEqual([1]);
  });

  test("文字列の key", async () => {
    const get = dedupe((name: string) => Promise.resolve(name.length));
    await expect(get("abc")).resolves.toBe(3);
  });

  test("型", () => {
    const { fn } = createFetch();
    expectTypeOf(dedupe(fn)).toEqualTypeOf<(key: number) => Promise<string>>();
  });
});
