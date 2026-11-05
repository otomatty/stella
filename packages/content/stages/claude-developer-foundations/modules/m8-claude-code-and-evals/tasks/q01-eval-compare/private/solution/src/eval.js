/**
 * 前後の空白を除いて、期待する答えと完全に一致するかを採点する。
 * @param {string} output 生成した答え
 * @param {{ expected: string }} testCase 評価のケース
 * @returns {boolean}
 */
export function exactMatch(output, testCase) {
  return output.trim() === testCase.expected.trim();
}

/**
 * 評価のケースを順に回し、合格の数と合格率を出す。
 * @param {{ id: string, input: string, expected: string }[]} cases 評価のケース
 * @param {(input: string) => Promise<string>} generate 答えを作る関数 (評価する仕組み)
 * @param {(output: string, testCase: object) => boolean | Promise<boolean>} grade 採点の関数
 * @returns {Promise<{ total: number, passed: number, rate: number, results: { id: string, pass: boolean, output: string | null, error?: string }[] }>}
 */
export async function runEval(cases, generate, grade) {
  if (cases.length === 0) throw new Error("評価のケースがありません");
  const ids = new Set();
  for (const testCase of cases) {
    if (ids.has(testCase.id))
      throw new Error(`ケースの ID が重なっています: ${testCase.id}`);
    ids.add(testCase.id);
  }

  const results = [];
  for (const testCase of cases) {
    let output;
    try {
      output = await generate(testCase.input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      results.push({
        id: testCase.id,
        pass: false,
        output: null,
        error: reason,
      });
      continue;
    }
    const pass = (await grade(output, testCase)) === true;
    results.push({ id: testCase.id, pass, output });
  }
  const passed = results.filter((result) => result.pass).length;
  return { total: cases.length, passed, rate: passed / cases.length, results };
}

/**
 * 同じ評価のセットで、変更の前と後を比べる。
 * @param {{ rate: number, results: { id: string, pass: boolean }[] }} before 変更の前の結果
 * @param {{ rate: number, results: { id: string, pass: boolean }[] }} after 変更の後の結果
 * @returns {{ before: number, after: number, delta: number, regressions: string[], fixes: string[] }}
 */
export function compareRuns(before, after) {
  const beforeIds = before.results.map((result) => result.id);
  const afterById = new Map(after.results.map((result) => [result.id, result]));
  if (
    beforeIds.length !== after.results.length ||
    !beforeIds.every((id) => afterById.has(id))
  )
    throw new Error("前と後で、評価のケースが違います");

  const regressions = [];
  const fixes = [];
  for (const result of before.results) {
    const next = afterById.get(result.id);
    if (result.pass && !next.pass) regressions.push(result.id);
    if (!result.pass && next.pass) fixes.push(result.id);
  }
  return {
    before: before.rate,
    after: after.rate,
    delta: after.rate - before.rate,
    regressions,
    fixes,
  };
}
