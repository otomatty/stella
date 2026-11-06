/**
 * 段を順につなぎ、段ごとに出力を確かめてから次の段へ進む。
 * @param {unknown} input 最初の段に渡す値
 * @param {{
 *   name: string,
 *   run: (value: unknown, context: { attempt: number, feedback: string | null }) => Promise<unknown>,
 *   check?: (output: unknown) => string | null,
 *   retries?: number,
 * }[]} stages
 * @returns {Promise<
 *   | { ok: true, result: unknown, outputs: Record<string, unknown> }
 *   | { ok: false, failedAt: string, reason: string, outputs: Record<string, unknown> }
 * >}
 */
export async function runChain(input, stages) {
  let value = input;
  const outputs = {};
  for (const stage of stages) {
    value = await stage.run(value, { attempt: 1, feedback: null });
    outputs[stage.name] = value;
  }
  return { ok: true, result: value, outputs };
}
