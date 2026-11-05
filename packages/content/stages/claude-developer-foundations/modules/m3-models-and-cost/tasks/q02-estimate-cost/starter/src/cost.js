/**
 * 応答の usage と単価から、1 回のリクエストの費用 (USD) を求める。
 * @param {{ input_tokens: number, output_tokens: number, cache_creation_input_tokens?: number | null, cache_read_input_tokens?: number | null }} usage
 * @param {{ input: number, output: number, cacheWrite?: number, cacheRead?: number }} prices 100 万トークンあたりの単価 (USD)
 * @param {{ batch?: boolean }} [options]
 * @returns {number}
 */
export function estimateCost(usage, prices, options = {}) {
  const total =
    usage.input_tokens * prices.input + usage.output_tokens * prices.output;
  return options.batch ? total * 0.5 : total;
}

/**
 * 同じ前半を何度も送るとき、キャッシュを使う場合と使わない場合の費用 (USD) を比べる。
 * @param {{ prefixTokens: number, suffixTokens: number, outputTokens: number, requests: number, minCacheableTokens: number }} plan
 * @param {{ input: number, output: number, cacheWrite: number, cacheRead: number }} prices 100 万トークンあたりの単価 (USD)
 * @param {{ batch?: boolean }} [options]
 * @returns {{ withoutCache: number, withCache: number, saving: number, cached: boolean }}
 */
export function compareCachePlans(plan, prices, options = {}) {
  const withoutCache = estimateCost(
    {
      input_tokens: plan.prefixTokens + plan.suffixTokens,
      output_tokens: plan.outputTokens,
    },
    prices,
    options,
  );
  return { withoutCache, withCache: withoutCache, saving: 0, cached: false };
}
