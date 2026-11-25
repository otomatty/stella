// 問17 Promise.allSettled で、成功した Promise の数を返す
//     例: settledCount([成功, 失敗, 成功]) → 2 で解決する
// async と await を使わずに書いてください。
// 引数と戻り値に型注釈を付け、Promise の中身の型まで書いてください。

export function settledCount(promises: Promise<number>[]): Promise<number> {
  return Promise.allSettled(promises).then(
    (results) => results.filter((r) => r.status === "fulfilled").length,
  );
}
