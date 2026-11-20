// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// ドア、照明、タイマー、チケットの状態を表す型は定義済みです。引数と戻り値には型注釈を付けること。
// どの型も、state や status で今の状態を見分ける判別可能なユニオン型になっている。
// 状態を変える関数は、元のオブジェクトを書き換えずに、新しい状態のオブジェクトを返す。今の状態では変えられないときは、受け取った状態をそのまま返す。

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

// 問4 鍵のかかったドアを、同じ鍵 key なら開錠して closed にする。鍵が違う、または鍵がかかっていなければそのまま
//     例: unlockDoor({ state: "locked", key: "A" }, "A") → { state: "closed" }
export function unlockDoor() {}
