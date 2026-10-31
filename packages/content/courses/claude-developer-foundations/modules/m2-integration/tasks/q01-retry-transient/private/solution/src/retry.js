const RETRYABLE_STATUSES = new Set([429, 500, 529]);

/**
 * 送り直せるエラー (429・500・529) だけを、間隔を広げながら送り直す。
 * @template T
 * @param {() => Promise<T>} send リクエストを送る関数
 * @param {{ maxRetries: number, baseDelayMs: number, sleep: (ms: number) => Promise<void> }} options
 * @returns {Promise<T>} 成功したときの応答
 */
export async function withRetry(send, options) {
  for (let retry = 0; ; retry++) {
    try {
      return await send();
    } catch (error) {
      if (!RETRYABLE_STATUSES.has(error?.status) || retry >= options.maxRetries)
        throw error;
      await options.sleep(delayOf(error, retry, options.baseDelayMs));
    }
  }
}

function delayOf(error, retry, baseDelayMs) {
  const retryAfterSeconds = Number(error.headers?.["retry-after"]);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0)
    return retryAfterSeconds * 1000;
  return baseDelayMs * 2 ** retry;
}
