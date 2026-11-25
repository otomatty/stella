// 問題
// 次の4つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. parseAge(input)
//    文字列を年齢（数値）にして返す。前後の空白は取り除く。
//    0〜150 の整数にならないときは、throw new Error(`年齢として読めません: ${input}`) で例外を投げる
//
// 2. safeParseAge(input)
//    parseAge を try-catch で囲み、例外が出たら null を返す。戻り値は number | null
//
// 3. errorMessage(error)
//    catch で受け取った値（型は unknown）からメッセージを取り出す。
//    Error なら message を、文字列ならその文字列を、それ以外は "不明なエラー" を返す
//    ヒント: error instanceof Error、typeof error === "string"
//
// 4. parseAges(inputs)
//    文字列の配列を年齢の配列にする。読めなかったものは飛ばし、そのメッセージを errors に集める。
//    { ages: number[]; errors: string[] } を返す。引数は readonly string[]
// parseAges では parseAge を try-catch で囲み、受け取った値は errorMessage で処理します。
export function parseAge(input: string): number {
  const text = input.trim();
  const age = Number(text);
  if (text === "" || !Number.isInteger(age) || age < 0 || age > 150) {
    throw new Error(`年齢として読めません: ${input}`);
  }
  return age;
}

export function safeParseAge(input: string): number | null {
  try {
    return parseAge(input);
  } catch {
    return null;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "不明なエラー";
}

export function parseAges(inputs: readonly string[]): { ages: number[]; errors: string[] } {
  const ages: number[] = [];
  const errors: string[] = [];
  for (const input of inputs) {
    try {
      ages.push(parseAge(input));
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }
  return { ages, errors };
}
