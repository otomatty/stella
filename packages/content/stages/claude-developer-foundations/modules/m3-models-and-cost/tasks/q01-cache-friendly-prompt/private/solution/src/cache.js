/**
 * 毎回同じ指示と資料をキャッシュで使い回せる形に、リクエストを組み立てる。
 * @param {{ model: string, maxTokens: number, instructions: string, documents: string[], now: string, question: string, ttl?: "5m" | "1h" }} input
 * @returns {{ model: string, max_tokens: number, system: object[], messages: object[] }}
 */
export function buildCachedRequest(input) {
  const stable = [input.instructions, ...input.documents];
  const cacheControl =
    input.ttl === "1h"
      ? { type: "ephemeral", ttl: "1h" }
      : { type: "ephemeral" };
  const system = stable.map((text, index) =>
    index === stable.length - 1
      ? { type: "text", text, cache_control: cacheControl }
      : { type: "text", text },
  );
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    system,
    messages: [
      {
        role: "user",
        content: `今の時刻: ${input.now}\n\n${input.question}`,
      },
    ],
  };
}

/**
 * 応答の usage から、キャッシュの効き方を読み取る。
 * @param {{ input_tokens: number, cache_creation_input_tokens?: number | null, cache_read_input_tokens?: number | null }} usage
 * @returns {{ totalInput: number, read: number, written: number, uncached: number, status: "hit" | "write" | "none" }}
 */
export function readCacheUsage(usage) {
  const read = usage.cache_read_input_tokens ?? 0;
  const written = usage.cache_creation_input_tokens ?? 0;
  const uncached = usage.input_tokens;
  return {
    totalInput: read + written + uncached,
    read,
    written,
    uncached,
    status: statusOf(read, written),
  };
}

function statusOf(read, written) {
  if (read > 0) return "hit";
  if (written > 0) return "write";
  return "none";
}
