// 問10 COLOR_CODES から色の番号を返す。引数の型は keyof typeof COLOR_CODES
//     例: colorCode("green") → "#00ff00"
// 引数と戻り値に型注釈を付けます。

export const COLOR_CODES = { red: "#ff0000", green: "#00ff00", blue: "#0000ff" } as const;

export function colorCode(name: keyof typeof COLOR_CODES): string {
  return COLOR_CODES[name];
}
