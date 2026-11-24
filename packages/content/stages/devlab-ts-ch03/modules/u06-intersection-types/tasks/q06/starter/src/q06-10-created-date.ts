// 問10 createdAt を「2026-12-01」の形にする（toISOString の先頭10文字）
//     例: createdDate({ id: 1, createdAt: 日時 }) → "2026-12-01"
// 引数と戻り値に型注釈を付ける。
// 引数の型には Identified & Timestamped と書く。

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

export function createdDate() {}
