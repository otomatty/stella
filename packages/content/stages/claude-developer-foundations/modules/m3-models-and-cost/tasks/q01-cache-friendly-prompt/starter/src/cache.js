/**
 * 毎回同じ指示と資料をキャッシュで使い回せる形に、リクエストを組み立てる。
 * @param {{ model: string, maxTokens: number, instructions: string, documents: string[], now: string, question: string, ttl?: "5m" | "1h" }} input
 * @returns {{ model: string, max_tokens: number, system: object[], messages: object[] }}
 */
export function buildCachedRequest(input) {
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    system: [
      { type: "text", text: input.instructions },
      ...input.documents.map((text) => ({ type: "text", text })),
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `今の時刻: ${input.now}\n\n${input.question}`,
            cache_control: { type: "ephemeral" },
          },
        ],
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
  return {
    totalInput: usage.input_tokens,
    read: usage.cache_read_input_tokens,
    written: usage.cache_creation_input_tokens,
    uncached: usage.input_tokens,
    status: "hit",
  };
}
