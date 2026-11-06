const PER_TOKENS = 1_000_000;

const USAGE_PRICES = [
  ["input_tokens", "input"],
  ["cache_creation_input_tokens", "cacheWrite"],
  ["cache_read_input_tokens", "cacheRead"],
  ["output_tokens", "output"],
];

/**
 * 応答の usage と単価から、1 回のリクエストの費用 (USD) を求める。
 * @param {{ input_tokens: number, output_tokens: number, cache_creation_input_tokens?: number | null, cache_read_input_tokens?: number | null }} usage
 * @param {{ input: number, output: number, cacheWrite?: number, cacheRead?: number }} prices 100 万トークンあたりの単価 (USD)
 * @param {{ batch?: boolean }} [options]
 * @returns {number}
 */
export function estimateCost(usage, prices, options = {}) {
  let total = 0;
  for (const [field, priceName] of USAGE_PRICES) {
    const tokens = usage[field] ?? 0;
    if (!Number.isInteger(tokens) || tokens < 0)
      throw new Error(`${field} は 0 以上の整数にしてください: ${tokens}`);
    if (tokens === 0) continue;
    const price = prices[priceName];
    if (!Number.isFinite(price) || price < 0)
      throw new Error(`${priceName} の単価がありません`);
    total += (tokens * price) / PER_TOKENS;
  }
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
  if (!Number.isInteger(plan.requests) || plan.requests < 1)
    throw new Error(`requests は 1 以上の整数にしてください: ${plan.requests}`);
  const uncachedOnce = estimateCost(
    {
      input_tokens: plan.prefixTokens + plan.suffixTokens,
      output_tokens: plan.outputTokens,
    },
    prices,
    options,
  );
  const withoutCache = uncachedOnce * plan.requests;
  if (plan.prefixTokens < plan.minCacheableTokens)
    return { withoutCache, withCache: withoutCache, saving: 0, cached: false };

  const first = estimateCost(
    {
      input_tokens: plan.suffixTokens,
      cache_creation_input_tokens: plan.prefixTokens,
      output_tokens: plan.outputTokens,
    },
    prices,
    options,
  );
  const later = estimateCost(
    {
      input_tokens: plan.suffixTokens,
      cache_read_input_tokens: plan.prefixTokens,
      output_tokens: plan.outputTokens,
    },
    prices,
    options,
  );
  const withCache = first + later * (plan.requests - 1);
  return {
    withoutCache,
    withCache,
    saving: withoutCache - withCache,
    cached: true,
  };
}
