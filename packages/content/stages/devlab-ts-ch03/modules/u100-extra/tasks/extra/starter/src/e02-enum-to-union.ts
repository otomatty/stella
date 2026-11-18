// 03-e02 発展問題 enum をユニオン型に置き換える
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/enum
//
// 問題
// 下のコードは enum を使っています。サバイバルTypeScriptでは、enum の代わりに
// ユニオン型を使うことを勧めています。次のように書き直してください。
//
// 1. enum Color を消し、Color を "red" | "green" | "blue" のユニオン型にする
// 2. COLOR_HEX を、as const を付けたオブジェクトにする（キーは色の名前、値は "#ff0000" など）
// 3. toHex(color) と isColor(text) を、新しい Color と COLOR_HEX を使って書き直す
//    呼び出す側は、toHex("red") のように文字列をそのまま渡せるようになる
//
// 説明すること（答えは、この下に // のコメントで書く）
// - enum には、どんな問題があるか

export enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
}

export const COLOR_HEX = {
  [Color.Red]: "#ff0000",
  [Color.Green]: "#00ff00",
  [Color.Blue]: "#0000ff",
};

export function toHex(color: Color): string {
  return COLOR_HEX[color];
}

export function isColor(text: string): boolean {
  return Object.values(Color).includes(text as Color);
}
