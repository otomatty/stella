// 問4 Named に createdAt を足した Named & Timestamped を返す
//     例: stamp({ name: "メモ" }, 日時) → { name: "メモ", createdAt: 日時 }
// 引数と戻り値に型注釈を付ける。
// 戻り値の型には Named & Timestamped と書く。

export type Named = { name: string };

export type Timestamped = { createdAt: Date };

export function stamp() {}
