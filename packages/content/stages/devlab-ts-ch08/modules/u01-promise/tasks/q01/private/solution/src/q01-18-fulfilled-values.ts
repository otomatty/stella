// 問18 Promise.allSettled で、成功した値だけの配列を返す（元の順）
//     例: fulfilledValues([1 で成功, 失敗, 3 で成功]) → [1, 3] で解決する
// async と await を使わずに書いてください。
// 引数と戻り値に型注釈を付け、Promise の中身の型まで書いてください。

export function fulfilledValues(promises: Promise<number>[]): Promise<number[]> {
  return Promise.allSettled(promises).then((results) =>
    results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
  );
}
