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
  const names = new Set();
  for (const stage of stages) {
    if (names.has(stage.name))
      throw new Error(`段の名前が重なっています: ${stage.name}`);
    names.add(stage.name);
  }

  let value = input;
  const outputs = {};
  for (const stage of stages) {
    const outcome = await runStage(stage, value);
    if (!outcome.ok) {
      return {
        ok: false,
        failedAt: stage.name,
        reason: outcome.reason,
        outputs,
      };
    }
    outputs[stage.name] = outcome.output;
    value = outcome.output;
  }
  return { ok: true, result: value, outputs };
}

// 1 つの段を、ゲートを通るか retries を使い切るまで行う。
async function runStage(stage, value) {
  const attempts = (stage.retries ?? 0) + 1;
  let feedback = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let output;
    try {
      output = await stage.run(value, { attempt, feedback });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { ok: false, reason };
    }
    const reason = stage.check ? stage.check(output) : null;
    if (reason === null) return { ok: true, output };
    feedback = reason;
  }
  return { ok: false, reason: feedback };
}
