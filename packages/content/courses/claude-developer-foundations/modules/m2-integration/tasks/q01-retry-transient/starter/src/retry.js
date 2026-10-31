/**
 * 送り直せるエラー (429・500・529) だけを、間隔を広げながら送り直す。
 * @template T
 * @param {() => Promise<T>} send リクエストを送る関数
 * @param {{ maxRetries: number, baseDelayMs: number, sleep: (ms: number) => Promise<void> }} options
 * @returns {Promise<T>} 成功したときの応答
 */
export async function withRetry(send, options) {
  try {
    return await send();
  } catch {
    await options.sleep(options.baseDelayMs);
    return send();
  }
}
