// 問13 task（文字列で解決する）を待ち、0 以上の整数に変換して返す。そうでなければ `年齢が正しくありません: 文字列` の Error を投げる
//     例: parseAge(() => Promise.resolve("20")) → 20 で解決する
// async と await を使ってください。

export async function parseAge(task: () => Promise<string>): Promise<number> {
  const text = await task();
  const age = Number(text);
  if (!Number.isInteger(age) || age < 0) {
    throw new Error(`年齢が正しくありません: ${text}`);
  }
  return age;
}
