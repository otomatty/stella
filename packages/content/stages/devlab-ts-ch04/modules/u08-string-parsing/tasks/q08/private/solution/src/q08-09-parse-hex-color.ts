// 問9 "#ff0000" を [255, 0, 0] にする（Number.parseInt(…, 16)）。「#」と16進数6桁でなければ "色ではありません: <text>" の Error
//     例: parseHexColor("#00ff80") → [0, 255, 128]
// 引数と戻り値に型注釈を付けます。
// 必要な部分を slice で取り出します。
export function parseHexColor(text: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(text)) {
    throw new Error(`色ではありません: ${text}`);
  }
  return [
    Number.parseInt(text.slice(1, 3), 16),
    Number.parseInt(text.slice(3, 5), 16),
    Number.parseInt(text.slice(5, 7), 16),
  ];
}
