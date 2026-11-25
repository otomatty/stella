// 問5 text を JSON.parse で読んで返す。JSON として読めず SyntaxError が投げられたら null を返す
//     例: parseJsonOrNull("{a:1}") → null
// 引数と戻り値に型注釈を付けます。
// 投げられた値が SyntaxError かは instanceof で調べます。

export function parseJsonOrNull(text: string): unknown {
  try {
    const data: unknown = JSON.parse(text);
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}
