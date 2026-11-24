// 問12 最初の1文字だけを大文字にする
//     例: capitalize("hello") → "Hello"
// 戻り値には型注釈を付けてください。
// slice と toUpperCase が使えます。
// 文字列の組み立てにはテンプレートリテラルを使ってください。
export function capitalize(text: string): string {
  return `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;
}
