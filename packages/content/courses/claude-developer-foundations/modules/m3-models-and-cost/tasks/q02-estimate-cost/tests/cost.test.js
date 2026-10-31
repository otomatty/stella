import { describe, expect, test } from "vitest";
import { compareCachePlans, estimateCost } from "../src/cost.js";

// 教材用の例の単価 (100 万トークンあたりの USD)。実際の単価は料金のページで確かめる。
const prices = { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 };

describe("estimateCost", () => {
  test("入力と出力を、100 万トークンあたりの単価で計算する", () => {
    expect(
      estimateCost({ input_tokens: 1_000_000, output_tokens: 0 }, prices),
    ).toBeCloseTo(2, 10);
    expect(
      estimateCost({ input_tokens: 2000, output_tokens: 500 }, prices),
    ).toBeCloseTo(0.009, 10);
  });

  test("キャッシュの書き込みと読み込みを、それぞれの単価で計算する", () => {
    const usage = {
      input_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 30000,
      output_tokens: 500,
    };
    // 50×2 + 30000×0.2 + 500×10 = 11100 (100 万トークンあたり)
    expect(estimateCost(usage, prices)).toBeCloseTo(0.0111, 10);
    expect(
      estimateCost(
        {
          ...usage,
          cache_creation_input_tokens: 30000,
          cache_read_input_tokens: 0,
        },
        prices,
      ),
    ).toBeCloseTo(0.0801, 10);
  });

  test("バッチなら、キャッシュを含めた合計を半額にする", () => {
    const usage = {
      input_tokens: 50,
      cache_read_input_tokens: 30000,
      output_tokens: 500,
    };
    expect(estimateCost(usage, prices, { batch: true })).toBeCloseTo(
      0.00555,
      10,
    );
  });

  test("キャッシュの値が null や省略なら 0 として数える", () => {
    expect(
      estimateCost(
        {
          input_tokens: 2000,
          output_tokens: 500,
          cache_creation_input_tokens: null,
        },
        { input: 2, output: 10 },
      ),
    ).toBeCloseTo(0.009, 10);
  });

  test("トークン数が負の数や整数でなければ、エラーにする", () => {
    expect(() =>
      estimateCost({ input_tokens: -1, output_tokens: 0 }, prices),
    ).toThrow(/input_tokens/);
    expect(() =>
      estimateCost({ input_tokens: 10, output_tokens: 1.5 }, prices),
    ).toThrow(/output_tokens/);
  });

  test("使ったトークンの単価がなければ、エラーにする", () => {
    expect(() =>
      estimateCost(
        { input_tokens: 50, cache_read_input_tokens: 30000, output_tokens: 0 },
        { input: 2, output: 10 },
      ),
    ).toThrow(/cacheRead/);
  });
});

describe("compareCachePlans", () => {
  const plan = {
    prefixTokens: 30000,
    suffixTokens: 50,
    outputTokens: 500,
    requests: 10,
    minCacheableTokens: 512,
  };

  test("1 回目は書き込み、2 回目からは読み込みとして見積もる", () => {
    const result = compareCachePlans(plan, prices);
    // なし: (30050×2 + 500×10) × 10 回 / 100 万
    expect(result.withoutCache).toBeCloseTo(0.651, 10);
    // あり: 書き込み 0.0801 + 読み込み 0.0111 × 9 回
    expect(result.withCache).toBeCloseTo(0.18, 10);
    expect(result.saving).toBeCloseTo(0.471, 10);
    expect(result.cached).toBe(true);
  });

  test("1 回しか送らないなら、キャッシュを使うほうが高い", () => {
    const result = compareCachePlans({ ...plan, requests: 1 }, prices);
    expect(result.withoutCache).toBeCloseTo(0.0651, 10);
    expect(result.withCache).toBeCloseTo(0.0801, 10);
    expect(result.saving).toBeCloseTo(-0.015, 10);
  });

  test("前半が最低の長さに届かなければ、キャッシュしない場合と同じにする", () => {
    const result = compareCachePlans(
      { ...plan, prefixTokens: 400, minCacheableTokens: 512 },
      prices,
    );
    expect(result.cached).toBe(false);
    expect(result.withCache).toBeCloseTo(result.withoutCache, 10);
    expect(result.saving).toBeCloseTo(0, 10);
  });

  test("前半がちょうど最低の長さなら、キャッシュする", () => {
    const result = compareCachePlans(
      { ...plan, prefixTokens: 512, minCacheableTokens: 512 },
      prices,
    );
    expect(result.cached).toBe(true);
    expect(result.saving).toBeGreaterThan(0);
  });

  test("バッチの割引は、キャッシュの有無のどちらにも重なる", () => {
    const result = compareCachePlans(plan, prices, { batch: true });
    expect(result.withoutCache).toBeCloseTo(0.3255, 10);
    expect(result.withCache).toBeCloseTo(0.09, 10);
  });

  test("送る回数が 1 以上の整数でなければ、エラーにする", () => {
    expect(() => compareCachePlans({ ...plan, requests: 0 }, prices)).toThrow(
      /requests/,
    );
  });
});
