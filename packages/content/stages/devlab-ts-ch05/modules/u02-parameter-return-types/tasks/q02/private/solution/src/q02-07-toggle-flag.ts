// 問7 flags の key の値を反転する。key がなければ true にする。何も返さない
//     例: toggleFlag(flags, "dark") → flags.dark が反転する
// 引数には型注釈を付け、戻り値の型は void と明記してください。

export function toggleFlag(flags: { [key: string]: boolean }, key: string): void {
  flags[key] = !(flags[key] ?? false);
}
