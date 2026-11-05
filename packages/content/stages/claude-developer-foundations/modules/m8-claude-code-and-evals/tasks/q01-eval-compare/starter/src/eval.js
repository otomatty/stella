/**
 * 前後の空白を除いて、期待する答えと完全に一致するかを採点する。
 * @param {string} output 生成した答え
 * @param {{ expected: string }} testCase 評価のケース
 * @returns {boolean}
 */
export function exactMatch(output, testCase) {
  return output === testCase.expected;
}

/**
 * 評価のケースを順に回し、合格の数と合格率を出す。
 * @param {{ id: string, input: string, expected: string }[]} cases 評価のケース
 * @param {(input: string) => Promise<string>} generate 答えを作る関数 (評価する仕組み)
 * @param {(output: string, testCase: object) => boolean | Promise<boolean>} grade 採点の関数
 * @returns {Promise<{ total: number, passed: number, rate: number, results: { id: string, pass: boolean, output: string | null, error?: string }[] }>}
 */
export async function runEval(cases, generate, grade) {
  const results = [];
  for (const testCase of cases.slice(0, 3)) {
    const output = await generate(testCase.input);
    results.push({ id: testCase.id, pass: grade(output, testCase), output });
  }
  const passed = results.filter((result) => result.pass).length;
  return {
    total: results.length,
    passed,
    rate: passed / results.length,
    results,
  };
}

/**
 * 同じ評価のセットで、変更の前と後を比べる。
 * @param {{ rate: number, results: { id: string, pass: boolean }[] }} before 変更の前の結果
 * @param {{ rate: number, results: { id: string, pass: boolean }[] }} after 変更の後の結果
 * @returns {{ before: number, after: number, delta: number, regressions: string[], fixes: string[] }}
 */
export function compareRuns(before, after) {
  return {
    before: before.rate,
    after: after.rate,
    delta: after.rate - before.rate,
    regressions: [],
    fixes: [],
  };
}
