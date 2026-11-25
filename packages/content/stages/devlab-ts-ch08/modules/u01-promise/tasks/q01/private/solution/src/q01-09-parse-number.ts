// 問9 then の中で Number で数に変換する。数にならなければ（NaN なら）then の中で Error を投げる
//     例: parseNumber(Promise.resolve("12")) → 12 で解決する
//     例: parseNumber(Promise.resolve("abc")) → Error で失敗する
// async と await を使わずに書いてください。
// 引数と戻り値に型注釈を付け、Promise の中身の型まで書いてください。

export function parseNumber(promise: Promise<string>): Promise<number> {
  return promise.then((text) => {
    const n = Number(text);
    if (Number.isNaN(n)) {
      throw new Error(`数ではありません: ${text}`);
    }
    return n;
  });
}
