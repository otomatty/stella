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

// enum は JavaScript にない独自の構文で、文字列の enum には同じ文字列をそのまま渡せない（toHex("red") がエラーになる）
export type Color = "red" | "green" | "blue";

export const COLOR_HEX = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
} as const;

export function toHex(color: Color): string {
  return COLOR_HEX[color];
}

export function isColor(text: string): boolean {
  return text === "red" || text === "green" || text === "blue";
}
