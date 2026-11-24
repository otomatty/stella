// 問14 a と b で値が違うプロパティだけを、b の値で持つ Partial<Options> を返す
//     例: diffOptions(a, { ...a, size: 20 }) → { size: 20 }
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function diffOptions(a: Options, b: Options): Partial<Options> {
  const result: Partial<Options> = {};
  if (a.size !== b.size) {
    result.size = b.size;
  }
  if (a.color !== b.color) {
    result.color = b.color;
  }
  if (a.bold !== b.bold) {
    result.bold = b.bold;
  }
  return result;
}
