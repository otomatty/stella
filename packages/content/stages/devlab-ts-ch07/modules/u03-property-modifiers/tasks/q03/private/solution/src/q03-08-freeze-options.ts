// 問8 options のコピーを Object.freeze して、Readonly<Options> として返す
//     例: freezeOptions(options) → 書き換えられない Options
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function freezeOptions(options: Options): Readonly<Options> {
  return Object.freeze({ ...options });
}
